import Gantt from "frappe-gantt";
import { client } from "./utils/fetchWrapper.js";
import { months } from "./constants.js";
import { createFormattedDateFromStr } from "./utils/dateFunctions.js";

const addForm = document.querySelector("#add-task");
const deleteForm = document.querySelector("#delete-tasks");
const tasksCheckboxContainers = document.querySelectorAll(
  ".tasks-checkbox-container"
);
const msgEl = document.querySelector(".delete-msg");

let ganttChart;
let tasks;

async function fetchData() {
  client("data/data.json").then(
    (data) => {
      tasks = data;
      ganttChart = new Gantt("#gantt", tasks, {
        bar_height: 25,
        view_mode: "Week",
        custom_popup_html: function (task) {
          const start_day = task._start.getDate();
          const start_month = months[task._start.getMonth()];
          const end_day = task._end.getDate();
          const end_month = months[task._end.getMonth()];

          return `
          <div class='details-container'>
            <h5>${task.name}</h5>
            <br>
            <p>Task started on: ${start_day} ${start_month}</p>
            <p>Expected to finish by ${end_day} ${end_month}</p>
            <p>${task.progress}% completed!</p>
          </div>
        `;
        },
        on_date_change: function (task, start, end) {
          updateDate(task, start, end);
        },
        on_progress_change: function (task, progress) {
          updateProgress(task, progress);
        },
      });
      showGantt();
      addViewModes();
      addTaskCheckboxes();
    },
    (error) => {
      showErrorMsg();
    },
    hideLoader()
  );
}

function hideLoader() {
  document.getElementsByClassName("loading")[0].style.display = "none";
}

function showGantt() {
  document.getElementsByClassName("gantt-wrapper")[0].style.display = "block";
}

function showErrorMsg() {
  document.getElementsByClassName("error")[0].style.display = "flex";
}

function addViewModes() {
  document
    .querySelector(".chart-controls #day-btn")
    .addEventListener("click", () => {
      ganttChart.change_view_mode("Day");
    });
  document
    .querySelector(".chart-controls #week-btn")
    .addEventListener("click", () => {
      ganttChart.change_view_mode("Week");
    });
  document
    .querySelector(".chart-controls #month-btn")
    .addEventListener("click", () => {
      ganttChart.change_view_mode("Month");
    });
}

function addTaskCheckboxes() {
  tasksCheckboxContainers.forEach((container, i) => {
    container.innerHTML = "";
    const legend = document.createElement("legend");
    if (i === 0) {
      legend.appendChild(document.createTextNode("Dependencies"));
    } else {
      legend.appendChild(document.createTextNode("Tasks"));
    }
    container.appendChild(legend);
    tasks.map((task) => {
      const div = document.createElement("div");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = task.id;
      checkbox.name = "task";
      checkbox.value = task.id;

      const label = document.createElement("label");
      label.htmlFor = task.id;
      label.appendChild(document.createTextNode(task.name));
      div.appendChild(checkbox);
      div.appendChild(label);
      container.appendChild(div);
    });
  });
}

function addTask(e) {
  e.preventDefault();
  const formElements = e.target.elements;
  const name = formElements["task-name"].value;
  const start = formElements["start-date"].value;
  const end = formElements["end-date"].value;
  const progress = parseInt(formElements["progress"].value);
  const isImportant = formElements["is-important"].checked;
  const taskCheckboxes = formElements["task"];

  const timeDiff = new Date(end).getTime() - new Date(start).getTime();
  if (timeDiff <= 0) return;

  const depIds = [];
  if (tasks.length === 1) {
    if (taskCheckboxes.checked) {
      depIds.push(taskCheckboxes.id);
    }
  } else {
    taskCheckboxes.forEach((dep) => {
      if (dep.checked) {
        depIds.push(dep.id);
      }
    });
  }
  const newtask = {
    id: `${Date.now()}`,
    name,
    start,
    end,
    progress,
    dependencies: depIds.join(", "),
    custom_class: isImportant ? "is-important" : "",
  };
  // add task
  tasks.push(newtask);
  ganttChart.refresh(tasks);
  addTaskCheckboxes();
  msgEl.style.display = "none";
}

function deleteTasks(e) {
  e.preventDefault();

  const formElements = e.target.elements;
  const taskCheckboxes = formElements["task"];
  if (tasks.length === 1) {
    msgEl.style.display = "block";
    return;
  }
  const taskIds = [];
  taskCheckboxes.forEach((task) => {
    if (task.checked) {
      taskIds.push(task.id);
    }
  });
  if (taskIds.length === 0) return;
  if (taskIds.length === tasks.length) {
    msgEl.style.display = "block";
    return;
  }

  // remove deleted tasks
  const filteredTasks = tasks.filter((task) => {
    if (!taskIds.includes(task.id)) {
      return true;
    }
  });

  // remove deleted dependencies
  const newTasks = filteredTasks.map((tsk) => {
    if (tsk.dependencies.length === 0) {
      return tsk;
    }

    const depsArr = tsk.dependencies;
    const newDeps = depsArr.filter((dep) => {
      if (!taskIds.includes(dep)) {
        return true;
      }
    });

    return {
      ...tsk,
      dependencies: newDeps,
    };
  });

  tasks = newTasks;
  ganttChart.refresh(tasks);
  addTaskCheckboxes();
  msgEl.style.display = "none";
}

function updateDate(task, start, end) {
  const startYear = start.getFullYear();
  const startMonth = start.getMonth();
  const startDay = start.getDate();
  const endYear = end.getFullYear();
  const endMonth = end.getMonth();
  const endDay = end.getDate();
  const startStr = createFormattedDateFromStr(
    startYear,
    startMonth + 1,
    startDay
  );
  const endStr = createFormattedDateFromStr(endYear, endMonth + 1, endDay);

  const newTasks = tasks.map((tsk) => {
    if (tsk.id === task.id) {
      return {
        ...tsk,
        start: startStr,
        end: endStr,
      };
    }
    return tsk;
  });
  tasks = newTasks;
  ganttChart.refresh(tasks);
}

function updateProgress(task, progress) {
  const newTasks = tasks.map((tsk) => {
    if (tsk.id === task.id) {
      return {
        ...tsk,
        progress,
      };
    }
    return tsk;
  });
  tasks = newTasks;
  ganttChart.refresh(tasks);
}

fetchData();

addForm.addEventListener("submit", addTask);
deleteForm.addEventListener("submit", deleteTasks);
