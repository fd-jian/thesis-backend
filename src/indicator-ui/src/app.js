const MAX_LENGTH_STATS = 20;

const GYRO_CHART = 'gyro-chart';
const LIN_ACC_CHART = 'lin-acc-chart';
const ACCELERO_CHART = 'accelero-chart';
const LIGHT_CHART = 'light-chart';

const DEFAULT_TICK_CONF = {
  ticks: {
    stepSize: 1,
    suggestedMin: -8,
    suggestedMax: 8
  }
};

const CHART_CONFIGS = {
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
    ticks: {
      stepSize: 10,
      suggestedMin: 0,
      suggestedMax: 150
    },
    paramLength: 1,
    topicName: '/topic/light'
  }
};

const CHART_COLORS = [ 
  'rgba(255, 255, 0, 0.6)', // yellow
  'rgba(255, 0, 181, 0.6)', // pink
  'rgba(0, 152, 255, 0.6)', // indigo
  'rgba(0, 255, 0, 0.6)',   // green
  'rgba(255, 206, 86, 0.6)' // okra
];

const CHART_DEFAULT_DATA = {
  lastUpdated: 0
};

let chartsById = {};
const chartData = {
  [GYRO_CHART]: { ...CHART_DEFAULT_DATA },
  [LIN_ACC_CHART]: { ...CHART_DEFAULT_DATA },
  [ACCELERO_CHART]: { ...CHART_DEFAULT_DATA },
  [LIGHT_CHART]: { ...CHART_DEFAULT_DATA }
}

let statChart = null;
const statsChartData = {
  timeSum: "0",
  count: 0,
  countPerSec: "0",
  stamp: "",
  lastUpdated: 0
};

let stompClient = null;
let connected = false;
let isRunning = false;

window.onload = function() {
  const btn = document.createElement("BUTTON");
  btn.id = 'btn-connect'
  btn.textContent = "CONNECT";
  document.getElementById("buttons").appendChild(btn);
  btn.disabled = true;
  btn.onclick = function () {
    console.log("connect btn")
    connect();
  }

  const disc = document.createElement("BUTTON");
  disc.id = 'btn-disconnect'
  disc.textContent = "DISCONNECT";
  disc.disabled = true;
  document.getElementById("buttons").appendChild(disc);
  disc.onclick = function () {
    console.log("disconnect btn")
    disconnect();
  }

  const pause = document.createElement("BUTTON");
  pause.id = 'btn-pause'
  pause.textContent = "PAUSE GRAPH";
  pause.disabled = true;
  document.getElementById("buttons").appendChild(pause);
  pause.onclick = function () {
    clearGraphIntervals();
  }

  const resume = document.createElement("BUTTON");
  resume.id = 'btn-resume'
  resume.textContent = "RESUME GRAPH";
  resume.disabled = true;
  document.getElementById("buttons").appendChild(resume);
  resume.onclick = function () {
    setGraphIntervals();
  }

  const linAccChartCtx = document.getElementById(LIN_ACC_CHART).getContext('2d');
  const acceleroChartCtx = document.getElementById(ACCELERO_CHART).getContext('2d');
  const gyroChartCtx = document.getElementById(GYRO_CHART).getContext('2d');
  const lightChartCtx = document.getElementById(LIGHT_CHART).getContext('2d');

  chartsById = { 
    [LIN_ACC_CHART]: new Chart(linAccChartCtx, createAcceleroChartCfg(LIN_ACC_CHART)),
    [ACCELERO_CHART]: new Chart(acceleroChartCtx, createAcceleroChartCfg(ACCELERO_CHART)),
    [GYRO_CHART]: new Chart(gyroChartCtx, createAcceleroChartCfg(GYRO_CHART)),
    [LIGHT_CHART]: new Chart(lightChartCtx, createAcceleroChartCfg(LIGHT_CHART))
  };
    
  const statChartCtx = document.getElementById('stat-chart').getContext('2d');
  statChart = new Chart(statChartCtx, getStatsChartCfg());

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
      handleStats(JSON.parse(stats.body));
    });

    Object.entries(CHART_CONFIGS).forEach(([chartId, config]) => {
      stompClient.subscribe(config.topicName, function (record) {
        handleChartUpdate(JSON.parse(record.body), chartId);
      });
    });

  });
  socket.onclose = function () {
    console.log("connection closed, reconnecting in 3s");
    setConnected(false);
    setTimeout(connect, 3000);
  }
}

function handleChartUpdate(record, chartId) {
  const timings = chartData[chartId];
  const now = Date.now();

  if(now - timings.lastUpdated < 100) {
    // use max 1 record every 100ms for performance reasons.
    // the rest of the records will be ignored and not displayed
    return 
  }

  timings.lastUpdated = now;
  const chart = chartsById[chartId];

  chart.data.datasets.forEach((dataset) => {
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

  chart.update({
    preservation: true
  });
}

function handleStats(stats) {
  statsChartData.lastUpdated = new Date();
  statsChartData.count = stats.count;
  statsChartData.timeSum = stats.timeSumSec;
  statsChartData.countPerSec = stats.countPerSecond;
  statsChartData.stamp = stats.time;
}

function disconnect() {
  if (stompClient !== null) {
    stompClient.disconnect();
  }
  setConnected(false);
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

function clearGraphIntervals() {
  if(!isRunning) {
    return false;
  }
  isRunning = false;
  // TODO: implement pause

  refreshPauseBtns();
  console.log("pause graph");
}

function setGraphIntervals() {
  if(isRunning) {
    return false;
  }
  isRunning = true;
  // TODO: implement resume

  refreshPauseBtns();
  console.log("resume graph");
}

function toggleGraphIntervals() {
  isRunning ? clearGraphIntervals() : setGraphIntervals();
}

function refreshStatsGraph() {
  let now = new Date()
  if (now - statsChartData.lastUpdated > 2000) {
    statsChartData.countPerSec = "0";
  }
  statChart.data.labels.push(now);
  if (statChart.data.labels.length > MAX_LENGTH_STATS) {
    statChart.data.labels.shift();
  }

  statChart.data.datasets.forEach((dataset) => {
    switch(dataset['label']) {
      case 'countPerSec':
        dataset.data.push(parseFloat(statsChartData.countPerSec));
        break;
      default:
        console.log("unknown dataset mentioned.")
    }
    if (dataset.data.length > MAX_LENGTH_STATS ) {
      dataset.data.shift();
    }
  });
  statChart.update(0);
}

const indexToAlphaNumeric = i => ((num = i + 10) > 35 
  ? num % 36 + 10 
  : num).toString(36);
const getNum = a => a.charCodeAt(0) - 97;

function createAcceleroChartCfg(chartId) {
  // create as many datasets as the param length of the respective chart.
  const datasets = [ ...Array(CHART_CONFIGS[chartId].paramLength).keys() ].map( (i) => 
    ({
      // Array index is mapped to an alphanumeric parameter name alphabetically:
      // 0 => 'x', 1 => 'y', 2 => 'z', 3 => 'a', 4 => 'b', ... etc.
      label: indexToAlphaNumeric(i + 23),
      data: [],
      backgroundColor: CHART_COLORS[i % CHART_COLORS.length]
      })
  );

  return {
    type: 'line', // bar, horizontalBar, pie, line, doughnut, radar, polarArea
    options: {
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
      },
      scales: {
        yAxes: [{
          ticks: CHART_CONFIGS[chartId].ticks
        }],
        xAxes: [{
          type: 'realtime',
          realtime: {         // per-axis options
            //duration: 10000,    // data in the past 20000 ms will be displayed
            delay: 100,        // delay of 1000 ms, so upcoming values are known before plotting a line
            pause: false       // chart is not paused
          },
        }]
      }
    },
    data: {
      datasets: datasets
    }
  }
}

function getStatsChartCfg() {
  return {
    type: 'line', // bar, horizontalBar, pie, line, doughnut, radar, polarArea
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: {
        duration: 1000 * 1,
        easing: 'linear'
      },
    },
    data: {
      labels: [ ],
      datasets: [{
        label: 'countPerSec',
        data: [ ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)'
        ]
      }]
    }
  }
}

