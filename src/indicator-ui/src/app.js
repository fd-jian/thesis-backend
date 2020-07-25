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
let charts = []

let lastUpdatedStats;
let lastUpdatedAcc;

const topicMap = {
  '/topic/linear-acceleration': 0,
  '/topic/accelerometer': 1,
  '/topic/gyroscope': 2,
  '/topic/light': 3,
}

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

  const linAccChartCtx = document.getElementById('lin-acc-chart').getContext('2d');
  linAccChart = new Chart(linAccChartCtx, createAcceleroChartCfg());

  const acceleroChartCtx = document.getElementById('accelero-chart').getContext('2d');
  acceleroChart = new Chart(acceleroChartCtx, createAcceleroChartCfg());
  
  const gyroChartCtx = document.getElementById('gyro-chart').getContext('2d');
  gyroChart = new Chart(gyroChartCtx, createAcceleroChartCfg());

  const lightChartCtx = document.getElementById('light-chart').getContext('2d');
  lightChart = new Chart(lightChartCtx, createAcceleroChartCfg(1));

  charts = [ linAccChart, acceleroChart, gyroChart, lightChart]
    
  charts.forEach(chart => chart.values = initial);

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
    const linearAccTopic = '/topic/linear-acceleration';
    stompClient.subscribe(linearAccTopic, function (record) {
      handleAccelerometer(JSON.parse(record.body), linearAccTopic);
    });
    const accelerometerTopic ='/topic/accelerometer';
    stompClient.subscribe(accelerometerTopic, function (record) {
      handleAccelerometer(JSON.parse(record.body), accelerometerTopic);
    });
    const gyroscopeTopic ='/topic/gyroscope';
    stompClient.subscribe(gyroscopeTopic, function (record) {
      handleAccelerometer(JSON.parse(record.body), gyroscopeTopic);
    });
    const lightTopic ='/topic/light';
    stompClient.subscribe(lightTopic, function (record) {
      handleAccelerometer(JSON.parse(record.body), lightTopic);
    });
  });
  socket.onclose = function () {
    console.log("connection closed, reconnecting in 3s");
    setConnected(false);
    setTimeout(connect, 3000);
  }
}

function handleAccelerometer(record, topic) {
  lastUpdatedAcc = new Date();
  charts[topicMap[topic]].values = [ record.x, record.y, record.z ]
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
  const lastUpdate2SecPlus = lastUpdatedAcc && now - lastUpdatedAcc > 2000;

  charts.forEach((chart, i) => {
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

  //linAccChart.data.labels.push(time);

  //const labels = linAccChart.data.labels;
  //if (labels.length > MAX_LENGTH_ACC) {
  //labels.shift();
  //}

  //linAccChart.data.datasets.forEach((dataset) => {
  //switch(dataset['label']) {
  //case 'x': 
  //dataset.data.push(x);
  //break;
  //case 'y':
  //dataset.data.push(y);
  //break;
  //case 'z':
        //dataset.data.push(z);
        //break;
      //default:
        //console.log("unknown dataset mentioned.")
    //}
    //if (dataset.data.length > MAX_LENGTH_ACC ) {
      //dataset.data.shift();
    //}
  //});

  //document.getElementById('count_sec').innerHTML = countPerSec;
  //document.getElementById('count').innerHTML = count;
  //document.getElementById('time_sum_sec').innerHTML = timeSum;
  //document.getElementById('stamp').innerHTML = stamp;

  //linAccChart.update(0);
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

const getAlpha = i => ((num = i + 10) > 35 ? num % 36 + 10 : num).toString(36);
const getNum = a => a.charCodeAt(0) - 97;

function createAcceleroChartCfg(paramLength = 3) {

  const colors = [ 
          'rgba(255, 255, 0, 0.6)', // yellow ela
          'rgba(255, 0, 181, 0.6)', // shocking pink
          'rgba(0, 152, 255, 0.6)', // indigo lulu 
          'rgba(0, 255, 0, 0.6)',   // green flex
          'rgba(255, 206, 86, 0.6)' // okra
  ];

  const datasets = [ ...Array(paramLength).keys() ].map( (x, i) => 
    ({
      label: getAlpha(i + 23),
      data: [ ],
      backgroundColor: [
        colors[i % colors.length]
      ]
    })
  );

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


