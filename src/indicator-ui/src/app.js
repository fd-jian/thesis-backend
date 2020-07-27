const STATS_INTERVAL = 500;
const MAX_LENGTH_STATS = 20;

const GYRO_CHART = 'gyro-chart';
const LIN_ACC_CHART = 'lin-acc-chart';
const ACCELERO_CHART = 'accelero-chart';
const LIGHT_CHART = 'light-chart';
const STATS_CHART = 'stat-chart';

const DEFAULT_TICK_CONF = {
  ticks: {
    stepSize: 1,
    suggestedMin: -8,
    suggestedMax: 8
  }
};

const LARGE_TICK_CONF = {
  ticks: {
    stepSize: 10,
    suggestedMin: 0,
    suggestedMax: 100
  }
};

const LINE_CHART_TYPE = {
  type: 'line' // bar, horizontalBar, pie, line, doughnut, radar, polarArea
};

const SENSOR_CHART_CONF = {
  [LIN_ACC_CHART]: { 
    ...DEFAULT_TICK_CONF,
    paramLength: 3,
    topicName: '/topic/linear-acceleration'
  },
  [ACCELERO_CHART]: { 
    ...DEFAULT_TICK_CONF,
    paramLength: 3,
    topicName: '/topic/accelerometer'
  },
  [GYRO_CHART]: { 
    ...DEFAULT_TICK_CONF,
    paramLength: 3,
    topicName: '/topic/gyroscope'
  },
  [LIGHT_CHART]: { 
    ...LARGE_TICK_CONF,
    paramLength: 1,
    topicName: '/topic/light'
  }
};

const SENSOR_CHART_COLORS = [ 
  'rgba(255, 255, 0, 0.6)', // yellow
  'rgba(255, 0, 181, 0.6)', // pink
  'rgba(0, 152, 255, 0.6)', // indigo
  'rgba(0, 255, 0, 0.6)',   // green
  'rgba(255, 206, 86, 0.6)' // okra
];

const CHART_DEFAULT_CONF = {
  elements: {
    point:{
      radius: 0
    }
  },
  responsive: true,
  maintainAspectRatio: true,
  animation: {
    //duration: 10000,
    duration: 0,
    easing: 'linear'
  },
  hover: {
    animationDuration: 0           // duration of animations when hovering an item
  },
  responsiveAnimationDuration: 0,    // animation duration after a resize
  plugins: {
    streaming: {
      frameRate: 20               // chart is drawn 5 times every second
    }
  }
};

const X_AXES_DEFAULT = {
  xAxes: [{
    type: 'realtime',
    realtime: {         // per-axis options
      //duration: 10000,    // data in the past 20000 ms will be displayed
      delay: 100,        // delay of 1000 ms, so upcoming values are known before plotting a line
      pause: false       // chart is not paused
    },
  }]
}

const CHART_DEFAULT_DATA = {
  lastUpdated: 0
};

let chartsById = {};
const chartData = {
  [GYRO_CHART]: { ...CHART_DEFAULT_DATA },
  [LIN_ACC_CHART]: { ...CHART_DEFAULT_DATA },
  [ACCELERO_CHART]: { ...CHART_DEFAULT_DATA },
  [LIGHT_CHART]: { ...CHART_DEFAULT_DATA },
  [STATS_CHART]: { ...CHART_DEFAULT_DATA }
}

let stompClient = null;
let connected = false;
let isRunning = false;

window.onload = function() {
  createButtons();

  chartsById = { 
    [LIN_ACC_CHART]: createSensorChart(LIN_ACC_CHART),
    [ACCELERO_CHART]: createSensorChart(ACCELERO_CHART),
    [GYRO_CHART]: createSensorChart(GYRO_CHART),
    [LIGHT_CHART]: createSensorChart(LIGHT_CHART),
    [STATS_CHART]: new Chart(
      document.getElementById(STATS_CHART).getContext('2d'), 
      getStatsChartCfg())
  };
    
  connect();
}

window.addEventListener('keypress', function(e) {
  switch(e.keyCode) {
    case 32:  // space/spacebar
      e.preventDefault();
      toggleGraphIntervals();
  }
});

function connect() {
  const socket = new SockJS('/api/visual/gs-guide-websocket');
  stompClient = Stomp.over(socket);
  stompClient.debug = null; // mute console logs
  stompClient.connect({}, function (frame) {
    setConnected(true);
    console.log('Connected: ' + frame);
    stompClient.subscribe('/topic/stats', function (stats) {
      handleStatsUpdate(JSON.parse(stats.body));
    });

    Object.entries(SENSOR_CHART_CONF).forEach(([chartId, config]) => {
      stompClient.subscribe(config.topicName, function (record) {
        handleSensorUpdate(JSON.parse(record.body), chartId);
      });
    });

  });

  socket.onclose = function () {
    console.log("connection closed, reconnecting in 3s");
    setConnected(false);
    setTimeout(connect, 3000);
  }

  resume();
}

function disconnect() {
  if (stompClient !== null) {
    stompClient.disconnect();
  }
  setConnected(false);
  pause();
}


function createSensorChart(chartId) { 
  return new Chart(
    document.getElementById(chartId).getContext('2d'), 
    createSensorChartCfg(chartId)); 
}

function createSensorChartCfg(chartId) {
  // create as many datasets as the param length of the respective chart.
  const datasets = [ ...Array(SENSOR_CHART_CONF[chartId].paramLength).keys() ]
    .map( (i) => ({
      // Array index is mapped to an alphanumeric parameter name alphabetically:
      // 0 => 'x', 1 => 'y', 2 => 'z', 3 => 'a', 4 => 'b', ... etc.
      label: indexToAlphaNumeric(i + 23),
      data: [],
      backgroundColor: SENSOR_CHART_COLORS[i % SENSOR_CHART_COLORS.length]
    }));

  return {
    ...LINE_CHART_TYPE,
    options: {
      ...CHART_DEFAULT_CONF,
      scales: {
        yAxes: [{
          ticks: SENSOR_CHART_CONF[chartId].ticks
        }],
        ...X_AXES_DEFAULT
      }
    },
    data: {
      datasets: datasets
    }
  }
}

function getStatsChartCfg() {
  return {
    ...LINE_CHART_TYPE,
    options: {
      ...CHART_DEFAULT_CONF,
      scales: {
        yAxes: [ LARGE_TICK_CONF ],
        ...X_AXES_DEFAULT
      }
    },
    data: {
      labels: [ ],
      datasets: [{
        label: 'countPerSec',
        data: [ ],
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }]
    }
  }
}

function handleSensorUpdate(record, chartId) {
  updateChart(chartId, record, (dataset, record, now) => {
    const curChartData = [record.x, record.y, record.z][getNum(dataset.label) - 23];
    if (curChartData) {
      dataset.data.push({ 
        //x: record.time,
        x: now,
        y: curChartData
      });
    } else {
      console.log("unknown dataset mentioned.")
    }
  });
}

function indexToAlphaNumeric(i) { 
  return ((num = i + 10) > 35 ? num % 36 + 10 : num).toString(36);
}

function getNum(a) { 
  return a.charCodeAt(0) - 97;
}

function handleStatsUpdate(stats) {
  updateChart(STATS_CHART, stats, (dataset, record, now) => {
    switch(dataset['label']) {
      case 'countPerSec':
        dataset.data.push({ 
          //x: record.time
          x: now,
          y: parseFloat(record.countPerSecond)
        });
        break;
      default:
        console.log("unknown dataset mentioned.")
    }
  });

  document.getElementById('count_sec').innerHTML = stats.countPerSecond;
  document.getElementById('count').innerHTML = stats.count;
  document.getElementById('time_sum_sec').innerHTML = stats.timeSumSec;
  document.getElementById('stamp').innerHTML = stats.time;
}

function updateChart(chartId, record, callback) {
  if(!isRunning) {
    return;
  }
  const now = Date.now();
  const timings = chartData[chartId];

  if(now - timings.lastUpdated < 100) {
    // use max 1 record every 100ms for performance reasons.
    // the rest of the records will be ignored and not displayed
    return 
  }

  timings.lastUpdated = now;

  const chart = chartsById[chartId];
  chart.data.datasets.forEach((dataset) => {
    callback(dataset, record, now);
  });

  chart.update({
    preservation: true
  });
}

function toggleGraphIntervals() {
  isRunning ? pause() : resume();
}

function resume() {
  if(isRunning) {
    return;
  }
  isRunning = true;

  Object.entries(chartsById).forEach(chartEntry => {
    chartEntry[1].options.scales.xAxes[0].realtime.pause = false;
    chartEntry[1].update({ duration: 0 });
  });

  refreshPauseBtns();
  console.log("resume graph");
}

function pause() {
  if(!isRunning) {
    return false;
  }
  isRunning = false;

  Object.entries(chartsById).forEach(chartEntry => {
    chartEntry[1].options.scales.xAxes[0].realtime.pause = true
    chartEntry[1].update({ duration: 0 });
  });

  refreshPauseBtns();
  console.log("pause graph");
}

function setConnected(conn) {
  connected = conn;
  const btnCon = document.getElementById("btn-connect");
  const btnDisc = document.getElementById("btn-disconnect");
  const btnPs = document.getElementById("btn-pause");
  const btnRes = document.getElementById("btn-resume");

  if(conn) {
    btnCon.disabled = true;
    btnDisc.disabled = false;
    refreshPauseBtns();
  } else {
    btnCon.disabled = false;
    btnDisc.disabled = true;
    btnPs.disabled = true;
    btnRes.disabled = true;
  }
}

function createButtons() {
  createButton('btn-connect', 'CONNECT', true, function () {
    console.log("connect btn")
    connect();
  });

  createButton('btn-disconnect', 'DISCONNECT', true, function () {
    console.log("disconnect btn")
    disconnect();
  })

  createButton('btn-pause', 'PAUSE GRAPH', true, function () {
    pause();
  });

  createButton('btn-resume', 'RESUME GRAPH', true, function () {
    resume();
  });
}

function createButton(id, textContent, disabled, callback) {
  const btn = document.createElement("BUTTON");
  btn.id = id
  btn.textContent = textContent;
  document.getElementById("buttons").appendChild(btn);
  btn.disabled = disabled;
  btn.onclick = callback;
  return btn;
}

function refreshPauseBtns() {
  const btnPs = document.getElementById("btn-pause");
  const btnRes = document.getElementById("btn-resume");

  if(!btnPs || !btnRes) {
    return false;
  }

  if(isRunning) {
    btnRes.disabled = true;
    btnPs.disabled = false;
  } else {
    btnRes.disabled = false;
    btnPs.disabled = true;
  }
}

