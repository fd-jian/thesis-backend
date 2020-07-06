let stompClient = null;

let timeSum = "0";
let count = 0;
let countPerSec = "0";

let x = 0;
let y = 0;
let z = 0;
let time = "";

let connected = false;

function connect() {
    const socket = new SockJS('/api/visual/gs-guide-websocket');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, function (frame) {
        setConnected(true);
        console.log('Connected: ' + frame);
        stompClient.subscribe('/topic/stats', function (stats) {
          handleStats(JSON.parse(stats.body));
        });
        stompClient.subscribe('/topic/accelerometer', function (record) {
          handleAccelerometer(JSON.parse(record.body));
        });
        //sendMsg("testing");
    });
}

function handleAccelerometer(record) {
  x = record.x;
  y = record.y;
  z = record.z;
  time = record.time;
}

function handleStats(stats) {
  count = stats.count;
  timeSum = stats.timeSumSec;
  countPerSec = stats.countPerSecond;
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

  if(conn) {
    btnCon.disabled = true;
    btnCon.classList.add("disabled")
    btnDisc.disabled = false;
    btnDisc.classList.remove("disabled")
  } else {
    btnCon.disabled = false;
    btnCon.classList.remove("disabled")
    btnDisc.disabled = true;
    btnDisc.classList.add("disabled")
  }

}

//function sendMsg(string) {
  //stompClient.send("/app/hello", {}, JSON.stringify({'name': 'hans'}));
//}

window.onload = function() {
  connect();
  const btn = document.createElement("BUTTON");
  btn.id = 'btn-connect'
  btn.innerHTML = "CONNECT";
  document.getElementById("buttons").appendChild(btn);
  btn.onclick = function () {
    console.log("connect btn")
    connect();
  }

  const disc = document.createElement("BUTTON");
  disc.id = 'btn-disconnect'
  disc.innerHTML = "DISCONNECT";
  document.getElementById("buttons").appendChild(disc);
  disc.onclick = function () {
    console.log("disconnect btn")
    disconnect();
  }

  //const send = document.createElement("BUTTON");
  //send.innerHTML = "SEND MESSAGE";
  //document.getElementById("buttons").appendChild(send);
  //send.onclick = function () {
    //console.log("connect btn")
    //sendMsg("test");
  //}

  //const clicker = document.createElement("BUTTON");
  //clicker.innerHTML = "CHART";
  //document.getElementById("buttons").appendChild(clicker);
  //clicker.onclick = function () {
    //console.log("chart btn")
  //}

  const acceleroChartCtx = document.getElementById('accelero-chart').getContext('2d');
  const acceleroChart = new Chart(acceleroChartCtx, {
    type: 'line', // bar, horizontalBar, pie, line, doughnut, radar, polarArea
    options: {
      //responsive: true,
      //maintainAspectRatio: true,
      //animation: {
        //duration: 1000 * 1,
        //easing: 'linear'
      //},
    },
    data: {
      labels: [
        'lab',
        'lel',
        'lul',
        'lel'
      ],
      datasets: [{
        label: 'x',
        data: [
          1234,
          5324,
          1534,
          1245
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)'
        ]
      },
      {
        label: 'y',
        data: [
          1245,
          1534,
          5324,
          1234
        ],
        backgroundColor: [
          'rgba(255, 206, 86, 0.6)'
        ]
      },
      {
        label: 'z',
        data: [
          1534,
          1245,
          1234,
          5324
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
        ]
      }
      ]
        
    }
  });

  setInterval(() => {
    acceleroChart.data.labels.push(time);
    acceleroChart.data.labels.shift();

    acceleroChart.data.datasets.forEach((dataset) => {
      //console.log(dataset);
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
      dataset.data.shift();
    });

    document.getElementById('count_sec').innerHTML = countPerSec;
    document.getElementById('count').innerHTML = count;
    document.getElementById('time_sum_sec').innerHTML = timeSum;

    acceleroChart.update(0);
  } , 150)

  const statChartCtx = document.getElementById('stat-chart').getContext('2d');
  const statChart = new Chart(statChartCtx, {
    type: 'line', // bar, horizontalBar, pie, line, doughnut, radar, polarArea
    options: {
      //responsive: true,
      //maintainAspectRatio: true,
      //animation: {
        //duration: 1000 * 1,
        //easing: 'linear'
      //},
    },
    data: {
      labels: [
      ],
      datasets: [{
        label: 'countPerSec',
        data: [
          1245,
          1534,
          5324,
          1234
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)'
        ]
      }]
        
    }
  });

  setInterval(() => {
    statChart.data.labels.push(new Date());
    statChart.data.labels.shift();

    statChart.data.datasets.forEach((dataset) => {
      //console.log(dataset);
      switch(dataset['label']) {
        case 'countPerSec':
          dataset.data.push(parseFloat(countPerSec));
          break;
        default:
          console.log("unknown dataset mentioned.")
      }
      dataset.data.shift();
    });
    //console.log(statChart.data.labels)
    //console.log(statChart.data.datasets)
    statChart.update(0);
  } , 1000)

}


