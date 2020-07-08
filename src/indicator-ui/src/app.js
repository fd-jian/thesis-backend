const STATS_INTERVAL = 500;
const ACC_INTERVAL = 100;
const MAX_LENGTH_ACC = 50;
const MAX_LENGTH_STATS = 20;

let stompClient = null;
let connected = false;

let isRunning = false;
let accInterval = null;
let statsInterval = null;

let acceleroChart = null;
let statChart = null;

let timeSum = "0";
let count = 0;
let countPerSec = "0";
let stamp = "";

let x = 0;
let y = 0;
let z = 0;
let time = "";

let lastUpdatedStats;
let lastUpdatedAcc;

window.onload = function() {
  connect();
  setGraphIntervals();

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

  const acceleroChartCtx = document.getElementById('accelero-chart').getContext('2d');
  acceleroChart = new Chart(acceleroChartCtx, createAcceleroChartCfg());

  const statChartCtx = document.getElementById('stat-chart').getContext('2d');
  statChart = new Chart(statChartCtx, getStatsChartCfg());

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
    stompClient.subscribe('/topic/accelerometer', function (record) {
      handleAccelerometer(JSON.parse(record.body));
    });
  });
  socket.onclose = function () {
    console.log("connection closed, reconnecting in 3s");
    setConnected(false);
    setTimeout(connect, 3000);
  }
}

function handleAccelerometer(record) {
  lastUpdatedAcc = new Date();
  x = record.x;
  y = record.y;
  z = record.z;
  time = record.time;
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
  if (lastUpdatedAcc && now - lastUpdatedAcc > 2000) {
    x = 0;
    y = 0;
    z = 0;
  }
  acceleroChart.data.labels.push(time);

  const labels = acceleroChart.data.labels;
  if (labels.length > MAX_LENGTH_ACC) {
    labels.shift();
  }

  acceleroChart.data.datasets.forEach((dataset) => {
    switch(dataset['label']) {
      case 'x': 
        dataset.data.push(x);
        break;
      case 'y':
        dataset.data.push(y);
        break;
      case 'z':
        dataset.data.push(z);
        break;
      default:
        console.log("unknown dataset mentioned.")
    }
    if (dataset.data.length > MAX_LENGTH_ACC ) {
      dataset.data.shift();
    }
  });

  document.getElementById('count_sec').innerHTML = countPerSec;
  document.getElementById('count').innerHTML = count;
  document.getElementById('time_sum_sec').innerHTML = timeSum;
  document.getElementById('stamp').innerHTML = stamp;

  acceleroChart.update(0);
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

function createAcceleroChartCfg() {
  return {
    type: 'line', // bar, horizontalBar, pie, line, doughnut, radar, polarArea
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: {
        duration: 1000 * 1,
        easing: 'linear'
      },
      scales: {
        xAxes: [{
          display: true,
          scaleLabel: {
            display: true,
            labelString: 'Month'
          }
        }],
        yAxes: [{
          display: true,
          ticks: {
            steps: 10,
            stepValue: 5,
            max: 8,
            min: -8
          }
        }]
      }
    },
    data: {
      labels: [],
      datasets: [{
        label: 'x',
        data: [ ],
        backgroundColor: [
            //'rgba(255, 206, 86, 0.6)', // okra
          //'rgba(244, 162, 97, 0.6)', // orange
          //'rgba(252, 186, 4, 0.6)', // yellow
          //'rgba(255, 186, 8, 0.6)', // yellow other
          //'rgba(255, 233, 0, 0.6)', // yellow bright
          'rgba(255, 255, 0, 0.6)' // yellow ela
        ]
      },
        {
        label: 'y',
        data: [ ],
        backgroundColor: [
          //'rgba(64, 249, 155, 0.6)' // green
          //'rgba(0, 255, 0, 0.6)' // green flex
          //'rgba(186, 39, 74, 0.6)'  // red
          //'rgba(255, 0, 175, 0.6)' // fashion fuchsia pink
          //'rgba(255, 0, 112, 0.6)' // winter sky magenta
          'rgba(255, 0, 181, 0.6)' // shocking pink
        ]
      },
        {
          label: 'z',
          data: [ ],
          backgroundColor: [
            //'rgba(75, 192, 192, 0.6)', // light blue
            'rgba(0, 152, 255, 0.6)', // indigo lulu
          ]
        }
      ]
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


