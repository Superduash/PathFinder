import { driver } from "driver.js";

export function startVisualizerTour() {
  const driverObj = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    nextBtnText: "Next ›",
    prevBtnText: "‹ Back",
    doneBtnText: "Done! 🚀",
    steps: [
      {
        element: "#toolbox-step",
        popover: {
          title: "🛠️ Toolbox & Terrain",
          description: "Select brushes to draw walls, drag Start/Goal points, or paint weighted terrain like sand (3× cost) and water (5× cost).",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#racers-step",
        popover: {
          title: "🏁 Racers Panel",
          description: "Choose up to 6 search algorithms to compete head-to-head. Pick heuristics like Manhattan or Euclidean for Greedy and A*.",
          side: "left",
          align: "start",
        },
      },
      {
        element: "#playback-step",
        popover: {
          title: "▶️ Playback Controls",
          description: "Hit Start (or press Space) to begin the race. Use Step to advance one frame at a time, or Reset to clear paths.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#speed-step",
        popover: {
          title: "⚡ Speed Multipliers",
          description: "Adjust simulation speed from 0.25× slow-motion teaching mode all the way to Max instant-skip.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#overlay-step",
        popover: {
          title: "🔢 Cell Numbers & Values",
          description: "Toggle numbers directly onto cells: Order checked (1, 2, 3), cost g(n), heuristic hint h(n), or total f = g + h.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#results-step",
        popover: {
          title: "📊 Head-to-Head Results",
          description: "Compare total cells checked, route length in steps, and overall path cost across all competing racers.",
          side: "top",
          align: "start",
        },
      },
    ],
  });

  driverObj.drive();
}

