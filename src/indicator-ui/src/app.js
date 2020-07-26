// TODO: losing color when screen is full with graph
const STATS_INTERVAL = 500;
const ACC_INTERVAL = 500;
const MAX_LENGTH_ACC = 50;
const MAX_LENGTH_STATS = 20;

let stompClient = null;
let connected = false;

let isRunning = false;
let accInterval = null;
let statsInterval = null;

let linAccChart = null;
let statChart = null;

let timeSum = "0";
let count = 0;
let countPerSec = "0";
let stamp = "";
let time = "";

const initial = [ 0, 0, 0 ];
let charts = {};

let lastUpdatedStats;
let lastUpdatedAcc;

const GYRO_CHART = 'gyro-chart';
const LIN_ACC_CHART = 'lin-acc-chart';
const ACCELERO_CHART = 'accelero-chart';
const LIGHT_CHART = 'light-chart';

const defaultTickConf = {
  stepSize: 1,
  suggestedMin: -8,
  suggestedMax: 8
  //max: 8,
  //min: -8
};

const tickConfigs = {
  [GYRO_CHART]: defaultTickConf,
  [LIN_ACC_CHART]: defaultTickConf,
  [ACCELERO_CHART]: defaultTickConf,
  [LIGHT_CHART]: {
    stepSize: 10,
    suggestedMin: 0,
    suggestedMax: 150
    //max: 150,
    //min: 0
  },
};

const topicToChartId = {
  '/topic/linear-acceleration': LIN_ACC_CHART,
  '/topic/accelerometer': ACCELERO_CHART,
  '/topic/gyroscope': GYRO_CHART,
  '/topic/light': LIGHT_CHART,
}

const chartTimings = {
  [GYRO_CHART]: {},
  [LIN_ACC_CHART]: {},
  [ACCELERO_CHART]: {},
  [LIGHT_CHART]: {}
}

const chartParamLengths = {
  [GYRO_CHART]: 3,
  [LIN_ACC_CHART]: 3,
  [ACCELERO_CHART]: 3,
  [LIGHT_CHART]: 1
};

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

  charts = { 
    [LIN_ACC_CHART]: new Chart(linAccChartCtx, createAcceleroChartCfg(LIN_ACC_CHART)),
    [ACCELERO_CHART]: new Chart(acceleroChartCtx, createAcceleroChartCfg(ACCELERO_CHART)),
    [GYRO_CHART]: new Chart(gyroChartCtx, createAcceleroChartCfg(GYRO_CHART)),
    [LIGHT_CHART]: new Chart(lightChartCtx, createAcceleroChartCfg(LIGHT_CHART))
  };
    
  Object.entries(charts).forEach(chartsEntry => chartsEntry[1].values = initial);

  const statChartCtx = document.getElementById('stat-chart').getContext('2d');
  statChart = new Chart(statChartCtx, getStatsChartCfg());

  connect();
  //setGraphIntervals();
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

    Object.entries(topicToChartId).forEach(topicNameChartId => {
      stompClient.subscribe(topicNameChartId[0], function (record) {
        handleAccelerometer(JSON.parse(record.body), topicNameChartId[1]);
      });
    });

  });
  socket.onclose = function () {
    console.log("connection closed, reconnecting in 3s");
    setConnected(false);
    setTimeout(connect, 3000);
  }
}

function handleAccelerometer(record, chartId) {
  const timings = chartTimings[chartId];
  const now = Date.now();

  if(!timings.old) timings.old = now;

  if(now - timings.old < 100) {
    return 
  }

  timings.old = now;
  const chart = charts[chartId];

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

  // update chart datasets keeping the current animation
    chart.update({
      preservation: true
    });
}

function handleStats(stats) {
  lastUpdatedStats = new Date();
  count = stats.count;
  timeSum = stats.timeSumSec;
  countPerSec = stats.countPerSecond;
  stamp = stats.time;
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
  clearInterval(accInterval);
  clearInterval(statsInterval);
  refreshPauseBtns();
  console.log("pause graph");
}

function setGraphIntervals() {
  if(isRunning) {
    return false;
  }
  isRunning = true;
  accInterval = setInterval(refreshAccGraph, ACC_INTERVAL);
  statsInterval = setInterval(refreshStatsGraph, STATS_INTERVAL);
  refreshPauseBtns();
  console.log("resume graph");
}

function toggleGraphIntervals() {
  isRunning ? clearGraphIntervals() : setGraphIntervals();
}


function refreshAccGraph() {
  let now = new Date()
  const lastUpdate2SecPlus = lastUpdatedAcc && now - lastUpdatedAcc > 2000;

  charts.forEach(chart => {
    if (lastUpdate2SecPlus) {
      chart.values = initial;
    }

    chart.data.labels.push(time);

    const labels = chart.data.labels;
    if (labels.length > MAX_LENGTH_ACC) {
      labels.shift();
    }

    chart.data.datasets.forEach((dataset) => {
      const curChartData = chart.values[getNum(dataset.label) - 23];

      if (curChartData) {
        dataset.data.push(curChartData);
      } else {
          console.log("unknown dataset mentioned.")
      }

      if (dataset.data.length > MAX_LENGTH_ACC ) {
        dataset.data.shift();
      }
    });

    // TODO: move somewhere else
    document.getElementById('count_sec').innerHTML = countPerSec;
    document.getElementById('count').innerHTML = count;
    document.getElementById('time_sum_sec').innerHTML = timeSum;
    document.getElementById('stamp').innerHTML = stamp;

    chart.update(0);
  });
}

function refreshStatsGraph() {
  let now = new Date()
  if (lastUpdatedStats && now - lastUpdatedStats > 2000) {
    countPerSec = "0";
  }
  statChart.data.labels.push(now);
  if (statChart.data.labels.length > MAX_LENGTH_STATS) {
    statChart.data.labels.shift();
  }

  statChart.data.datasets.forEach((dataset) => {
    console.log(countPerSec);
    switch(dataset['label']) {
      case 'countPerSec':
        dataset.data.push(parseFloat(countPerSec));
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

const getAlpha = i => ((num = i + 10) > 35 ? num % 36 + 10 : num).toString(36);
const getNum = a => a.charCodeAt(0) - 97;

function createAcceleroChartCfg(chartId) {

  const colors = [ 
          'rgba(255, 255, 0, 0.6)', // yellow ela
          'rgba(255, 0, 181, 0.6)', // shocking pink
          'rgba(0, 152, 255, 0.6)', // indigo lulu 
          'rgba(0, 255, 0, 0.6)',   // green flex
          'rgba(255, 206, 86, 0.6)' // okra
  ];

  const datasets = [ ...Array(chartParamLengths[chartId]).keys() ].map( (x, i) => 
    ({
      label: getAlpha(i + 23),
      data: [],
      backgroundColor: [
        colors[i % colors.length]
      ]
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
        //duration: 200,
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
          ticks: tickConfigs[chartId]
        }],
        xAxes: [{
          type: 'realtime',
          realtime: {         // per-axis options
            duration: 20000,    // data in the past 20000 ms will be displayed
            //refresh: 30,      // onRefresh callback will be called every 1000 ms
            delay: 200,        // delay of 1000 ms, so upcoming values are known before plotting a line
            pause: false,       // chart is not paused
            //ttl: undefined,     // data will be automatically deleted as it disappears off the chart
            ttl: undefined     // data will be automatically deleted as it disappears off the chart
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


