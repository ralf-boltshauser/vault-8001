const QuickChart = require("quickchart-js");
const fs = require("fs");

// read id from command line
const gameId = process.argv[2];

// read crews.json
const data = require(`./observability/${gameId}-crews.json`);

// Process data to extract turns, labels, and datasets
const turns = [...new Set(data.flat().map((entry) => entry.turn))];
const crews = [...new Set(data.flat().map((entry) => entry.name))];

const datasets = crews.map((crew) => {
  return {
    label: crew,
    data: turns.map((turn) => {
      const record = data
        .flat()
        .find((entry) => entry.name === crew && entry.turn === turn);
      return record ? record.capital : null;
    }),
    fill: true,
    borderColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
      Math.random() * 255
    )}, ${Math.floor(Math.random() * 255)}, 1)`,
    backgroundColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
      Math.random() * 255
    )}, ${Math.floor(Math.random() * 255)}, 0.2)`,
  };
});

// Create a QuickChart instance
const chart = new QuickChart();
chart.setWidth(800);
chart.setHeight(600);
chart.setConfig({
  type: "line",
  data: {
    labels: turns,
    datasets: datasets,
  },
  options: {
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Turn",
        },
      },
      y: {
        title: {
          display: true,
          text: "Capital",
        },
        beginAtZero: true,
      },
    },
  },
});

// Save the chart as an image
chart
  .toFile(`./observability/${gameId}-crews.png`)
  .then(() => console.log(`Chart saved as ${gameId}-crews.png`))
  .catch((err) => console.error("Error saving chart:", err));
