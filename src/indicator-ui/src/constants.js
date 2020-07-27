const GYRO_CHART = 'gyro-chart';
const LIN_ACC_CHART = 'lin-acc-chart';
const ACCELERO_CHART = 'accelero-chart';
const LIGHT_CHART = 'light-chart';
const STATS_CHART = 'stat-chart';

const LINE_CHART_TYPE = {
  type: 'line' // bar, horizontalBar, pie, line, doughnut, radar, polarArea
};

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

const SENSOR_CHARTS = [
  LIN_ACC_CHART,
  ACCELERO_CHART,
  GYRO_CHART,
  LIGHT_CHART
];

const CHART_CONF = {
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
  },
  [STATS_CHART]: {
    ...LARGE_TICK_CONF,
    datasets: {
      countPerSec: {
        label: 'countPerSec',
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }
    }
  }
};

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
      frameRate: 40               // chart is drawn 5 times every second
    }
  }
};

const X_AXES_DEFAULT = {
  xAxes: [{
    type: 'realtime',
    realtime: {         // per-axis options
      //duration: 10000,    // data in the past 20000 ms will be displayed
      delay: 350,        // delay of 1000 ms, so upcoming values are known before plotting a line
      pause: false       // chart is not paused
    },
  }]
}

const SENSOR_CHART_COLORS = [ 
  'rgba(255, 255, 0, 0.6)', // yellow
  'rgba(255, 0, 181, 0.6)', // pink
  'rgba(0, 152, 255, 0.6)', // indigo
  'rgba(0, 255, 0, 0.6)',   // green
  'rgba(255, 206, 86, 0.6)' // okra
];

const CHART_DEFAULT_DATA = {
  lastUpdated: 0
};

const BUTTON_IDS = {
  connect: 'btn-connect',
  disconnect: 'btn-disconnect',
  pause: 'btn-pause',
  resume: 'btn-resume'
};

const BUTTON_TEXTS = {
  [BUTTON_IDS.connect]: 'CONNECT',
  [BUTTON_IDS.disconnect]: 'DISCONNECT',
  [BUTTON_IDS.pause]: 'PAUSE_GRAPH',
  [BUTTON_IDS.resume]: 'RESUME_GRAPH',
}

const VIEW_IDS = {
  countPerSec: 'count_sec',
  count: 'count',
  timeSumSec: 'time_sum_sec',
  time: 'stamp',
};

const CHART_IDS = {
  gyroChart: GYRO_CHART,
  linAccChart: LIN_ACC_CHART,
  acceleroChart: ACCELERO_CHART,
  lightChart: LIGHT_CHART,
  statsChart: STATS_CHART
};

// other config constants
export {
  CHART_IDS,
  SENSOR_CHARTS,
  BUTTON_IDS,
  BUTTON_TEXTS,
  VIEW_IDS,
  LARGE_TICK_CONF,
  LINE_CHART_TYPE,
  CHART_CONF,
  SENSOR_CHART_COLORS,
  CHART_DEFAULT_CONF,
  X_AXES_DEFAULT,
  CHART_DEFAULT_DATA
}


