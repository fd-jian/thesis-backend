import {
  CHART_IDS,
  SENSOR_CHARTS,
  BUTTON_IDS,
  BUTTON_TEXTS,
  VIEW_IDS,
  LINE_CHART_TYPE,
  CHART_CONF,
  SENSOR_CHART_COLORS,
  CHART_DEFAULT_CONF,
  X_AXES_DEFAULT,
  CHART_DEFAULT_DATA
} from './constants.js';

const GYRO_CHART = CHART_IDS.gyroChart;
const LIN_ACC_CHART = CHART_IDS.linAccChart;
const ACCELERO_CHART = CHART_IDS.acceleroChart;
const LIGHT_CHART = CHART_IDS.lightChart;
const STATS_CHART_ID = CHART_IDS.statsChart;

let chartsById = {};
const chartData = {
  [GYRO_CHART]: { ...CHART_DEFAULT_DATA },
  [LIN_ACC_CHART]: { ...CHART_DEFAULT_DATA },
  [ACCELERO_CHART]: { ...CHART_DEFAULT_DATA },
  [LIGHT_CHART]: { ...CHART_DEFAULT_DATA },
  [STATS_CHART_ID]: { ...CHART_DEFAULT_DATA }
}

let stompClient = null;
let isRunning = false;

window.onload = function() {
  createButtons();

  chartsById = { 
    [LIN_ACC_CHART]: createSensorChart(LIN_ACC_CHART),
    [ACCELERO_CHART]: createSensorChart(ACCELERO_CHART),
    [GYRO_CHART]: createSensorChart(GYRO_CHART),
    [LIGHT_CHART]: createSensorChart(LIGHT_CHART),
    [STATS_CHART_ID]: new Chart(
      document.getElementById(STATS_CHART_ID).getContext('2d'), 
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

    SENSOR_CHARTS
      .map(chartId => [ chartId, CHART_CONF[chartId] ])
      .forEach(([chartId, config]) => {
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
  const datasets = [ ...Array(CHART_CONF[chartId].paramLength).keys() ]
    .map((i) => ({
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
          ticks: CHART_CONF[chartId].ticks
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
  const config = CHART_CONF[STATS_CHART_ID];
  return {
    ...LINE_CHART_TYPE,
    options: {
      ...CHART_DEFAULT_CONF,
      scales: {
        yAxes: [{
          ticks: config.ticks,
        }],
        ...X_AXES_DEFAULT
      }
    },
    data: {
      labels: [],
      datasets: [{
        ...config.datasets.countPerSec,
        data: []
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
  return indexToAlphaNumericNoOff(i + 10);
}

function indexToAlphaNumericNoOff(i) {
  return (i > 35 ? i % 36 + 10 : i).toString(36);
}

function getNum(a) { 
  return a.charCodeAt(0) - 97;
}

function handleStatsUpdate(stats) {
  updateChart(STATS_CHART_ID, stats, (dataset, record, now) => {
    switch(dataset['label']) {
      case CHART_CONF[STATS_CHART_ID].datasets.countPerSec.label:
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

  document.getElementById(VIEW_IDS.countPerSec).innerHTML = stats.countPerSec;
  document.getElementById(VIEW_IDS.count).innerHTML = stats.count;
  document.getElementById(VIEW_IDS.timeSumSec).innerHTML = stats.timeSumSec;
  document.getElementById(VIEW_IDS.time).innerHTML = stats.time;
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
  const btnCon = document.getElementById(BUTTON_IDS.connect);
  const btnDisc = document.getElementById(BUTTON_IDS.disconnect);
  const btnPs = document.getElementById(BUTTON_IDS.pause);
  const btnRes = document.getElementById(BUTTON_IDS.resume);

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
  createButton(BUTTON_IDS.connect, BUTTON_TEXTS[BUTTON_IDS.connect], function () {
    console.log("connect btn")
    connect();
  });
  createButton(BUTTON_IDS.disconnect, BUTTON_TEXTS[BUTTON_IDS.disconnect], function () {
    console.log("disconnect btn")
    disconnect();
  })
  createButton(BUTTON_IDS.pause, BUTTON_TEXTS[BUTTON_IDS.pause], function () {
    pause();
  });
  createButton(BUTTON_IDS.resume, BUTTON_TEXTS[BUTTON_IDS.resume], function () {
    resume();
  });
}

function createButton(id, textContent, callback) {
  const btn = document.createElement("BUTTON");
  btn.id = id
  btn.textContent = textContent;
  document.getElementById("buttons").appendChild(btn);
  btn.disabled = true;
  btn.onclick = callback;
  return btn;
}

function refreshPauseBtns() {
  const btnPs = document.getElementById(BUTTON_IDS.pause);
  const btnRes = document.getElementById(BUTTON_IDS.resume);

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

