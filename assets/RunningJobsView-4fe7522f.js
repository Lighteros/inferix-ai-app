import {
  g as getAPIClient,
  d as defineStore,
  J as JobStatusChange,
  T as TaskStatusChange,
  u as useNotifs,
  o as onMounted,
  a as openBlock,
  c as createElementBlock,
  b as onUnmounted,
  _ as _export_sfc,
  r as ref,
  w as watch,
  e as createBaseVNode,
  n as normalizeClass,
  f as createVNode,
  h as createBlock,
  i as resolveDynamicComponent,
  j as unref,
  t as toDisplayString,
  k as backendURL,
  l as api,
  p as pushScopeId,
  m as popScopeId,
  q as createCommentVNode,
  s as withDirectives,
  v as vModelText,
  A as ApiSpinner,
  x as resolveDirective,
  y as createTextVNode,
  z as __vite__cjsImport0_lodash,
  B as useAPIQueryCount,
  F as Fragment,
  C as renderList,
  D as createStaticVNode,
  E as resolveComponent,
  G as computed2,
  H as withCtx,
  I as defineComponent,
  K as reactive,
  L as AvailableJobSettingVisibility,
  M as vShow,
} from "./index-7ba45308.js";
import {
  J as JobsApi,
  _ as _imports_0,
  L as LastRenderedImage,
} from "./LastRenderedImage-6d6daeaa.js";
import {
  s as shortened,
  T as TabulatorFull,
  c as copyElementText,
  d as datetime,
  _ as _sfc_main$g,
  a as copyElementData,
  u as useWorkers,
} from "./workers-4d34dda6.js";
import {
  C as ConnectionStatus,
  N as NotificationBar,
  U as UpdateListener,
} from "./UpdateListener-0386af97.js";

const jobsAPI$1 = new JobsApi(getAPIClient());

// 'use' prefix is idiomatic for Pinia stores.
// See https://pinia.vuejs.org/core-concepts/
const useJobs = defineStore("jobs", {
  state: () => ({
    /** @type {API.Job} */
    activeJob: null,
    /**
     * ID of the active job. Easier to query than `activeJob ? activeJob.id : ""`.
     * @type {string}
     */
    activeJobID: "",

    /**
     * Set to true when it is known that there are no jobs at all in the system.
     * This is written by the JobsTable.vue component.
     */
    isJobless: false,
  }),
  getters: {
    canDelete() {
      return this._anyJobWithStatus([
        "queued",
        "paused",
        "failed",
        "completed",
        "canceled",
      ]);
    },
    canCancel() {
      return this._anyJobWithStatus(["queued", "active", "failed"]);
    },
    canRequeue() {
      return this._anyJobWithStatus([
        "canceled",
        "completed",
        "failed",
        "paused",
      ]);
    },
  },
  actions: {
    setIsJobless(isJobless) {
      this.$patch({ isJobless: isJobless });
    },
    setActiveJobID(jobID) {
      this.$patch({
        activeJob: { id: jobID, settings: {}, metadata: {} },
        activeJobID: jobID,
      });
    },
    setActiveJob(job) {
      // The "function" form of $patch is necessary here, as otherwise it'll
      // merge `job` into `state.activeJob`. As a result, it won't touch missing
      // keys, which means that metadata fields that existed on the previous job
      // but not on the new one will still linger around. By passing a function
      // to `$patch` this is resolved.
      this.$patch((state) => {
        state.activeJob = job;
        state.activeJobID = job.id;
        state.hasChanged = true;
      });
    },
    deselectAllJobs() {
      this.$patch({
        activeJob: null,
        activeJobID: "",
      });
    },

    /**
     * Actions on the selected jobs.
     *
     * All the action functions return a promise that resolves when the action has been performed.
     *
     * TODO: actually have these work on all selected jobs. For simplicity, the
     * code now assumes that only the active job needs to be operated on.
     */
    cancelJobs() {
      return this._setJobStatus("cancel-requested");
    },
    requeueJobs() {
      return this._setJobStatus("requeueing");
    },
    deleteJobs() {
      if (!this.activeJobID) {
        console.warn(`deleteJobs() impossible, no active job ID`);
        return new Promise((resolve, reject) => {
          reject("No job selected, unable to delete");
        });
      }

      return jobsAPI$1.deleteJob(this.activeJobID);
    },

    // Internal methods.

    /**
     *
     * @param {string[]} statuses
     * @returns bool indicating whether there is a selected job with any of the given statuses.
     */
    _anyJobWithStatus(statuses) {
      return (
        !!this.activeJob &&
        !!this.activeJob.status &&
        statuses.includes(this.activeJob.status)
      );
      // return this.selectedJobs.reduce((foundJob, job) => (foundJob || statuses.includes(job.status)), false);
    },

    /**
     * Transition the selected job(s) to the new status.
     * @param {string} newStatus
     * @returns a Promise for the API request.
     */
    _setJobStatus(newStatus) {
      if (!this.activeJobID) {
        console.warn(
          `_setJobStatus(${newStatus}) impossible, no active job ID`
        );
        return;
      }
      const statuschange = new JobStatusChange(
        newStatus,
        "requested from web interface"
      );
      return jobsAPI$1.setJobStatus(this.activeJobID, statuschange);
    },
  },
});

const jobsAPI = new JobsApi(getAPIClient());

// 'use' prefix is idiomatic for Pinia stores.
// See https://pinia.vuejs.org/core-concepts/
const useTasks = defineStore("tasks", {
  state: () => ({
    /** @type {API.Task} */
    activeTask: null,
    /**
     * ID of the active task. Easier to query than `activeTask ? activeTask.id : ""`.
     * @type {string}
     */
    activeTaskID: "",
  }),
  getters: {
    canCancel() {
      return this._anyTaskWithStatus(["queued", "active", "soft-failed"]);
    },
    canRequeue() {
      return this._anyTaskWithStatus(["canceled", "completed", "failed"]);
    },
  },
  actions: {
    setActiveTaskID(taskID) {
      this.$patch({
        activeTask: { id: taskID },
        activeTaskID: taskID,
      });
    },
    setActiveTask(task) {
      this.$patch({
        activeTask: task,
        activeTaskID: task.id,
      });
    },
    deselectAllTasks() {
      this.$patch({
        activeTask: null,
        activeTaskID: "",
      });
    },

    /**
     * Actions on the selected tasks.
     *
     * All the action functions return a promise that resolves when the action has been performed.
     *
     * TODO: actually have these work on all selected tasks. For simplicity, the
     * code now assumes that only the active task needs to be operated on.
     */
    cancelTasks() {
      return this._setTaskStatus("canceled");
    },
    requeueTasks() {
      return this._setTaskStatus("queued");
    },

    // Internal methods.

    /**
     *
     * @param {string[]} statuses
     * @returns bool indicating whether there is a selected task with any of the given statuses.
     */
    _anyTaskWithStatus(statuses) {
      return (
        !!this.activeTask &&
        !!this.activeTask.status &&
        statuses.includes(this.activeTask.status)
      );
      // return this.selectedTasks.reduce((foundTask, task) => (foundTask || statuses.includes(task.status)), false);
    },

    /**
     * Transition the selected task(s) to the new status.
     * @param {string} newStatus
     * @returns a Promise for the API request.
     */
    _setTaskStatus(newStatus) {
      if (!this.activeTaskID) {
        console.warn(
          `_setTaskStatus(${newStatus}) impossible, no active task ID`
        );
        return;
      }
      const statuschange = new TaskStatusChange(
        newStatus,
        "requested from web interface"
      );
      return jobsAPI.setTaskStatus(this.activeTaskID, statuschange);
    },
  },
});

// Maximum number of task log lines that will be stored.
const capacity = 1000;

/**
 * Store logs of the active task.
 */
const useTaskLog = defineStore("taskLog", {
  state: () => ({
    /**
     * Task log entries.
     *
     * The 'id' is just for Tabulator to uniquely identify rows, in order to be
     * able to scroll to them and keep them in order.
     *
     * @type {{ id: Number, line: string }[]} */
    history: [],
    /** @type { id: Number, line: string } */
    last: "",

    lastID: 0,
  }),
  getters: {
    empty: (state) => state.history.length == 0,
  },
  actions: {
    /**
     * @param {API.SocketIOTaskLogUpdate} taskLogUpdate
     */
    addTaskLogUpdate(taskLogUpdate) {
      this.addChunk(taskLogUpdate.log);
    },

    /**
     * Erase the entire task log history. Use this when switching between tasks.
     */
    clear() {
      this.$patch((state) => {
        state.history = [];
        state.last = null;
        state.lastID = 0;
        state.hasChanged = true;
      });
    },

    /**
     * Add a task log chunk.
     * @param {string} logChunk
     */
    addChunk(logChunk) {
      if (!logChunk) return;

      const lines = logChunk.trimEnd().split("\n");
      if (lines.length == 0) return;

      if (lines.length > capacity) {
        // Only keep the `capacity` last lines, so that adding them to the
        // history will not overflow the capacity.
        lines.splice(0, lines.length - capacity);
      }

      this.$patch((state) => {
        let entry = null;

        // Make sure there is enough space to actually add the new lines.
        this._pruneState(state, lines.length);

        for (let line of lines) {
          entry = this._createEntry(state, line);
          state.history.push(entry);
        }

        if (entry == null) {
          console.warn(
            "taskLog.addChunk: there were lines to add, but no entry created. Weird."
          );
          return;
        }

        state.last = entry;
        state.lastID = entry.id;
        state.hasChanged = true;
      });
    },

    _createEntry(state, line) {
      return { id: this._generateID(state), line: line };
    },

    /**
     * Ensure there is enough space in the history to fit `spaceForLineNum` lines.
     */
    _pruneState(state, spaceForLineNum) {
      if (spaceForLineNum > capacity) {
        // No need to calculate anything, just delete everything.
        state.history = [];
        return;
      }

      const pruneTo = capacity - spaceForLineNum;
      if (state.history.length <= pruneTo) return;

      const deleteCount = state.history.length - pruneTo;
      state.history.splice(0, deleteCount);
    },
    _generateID(state) {
      return ++state.lastID;
    },
  },
});

const _hoisted_1$d = { id: "notification_list" };

const _sfc_main$f = {
  setup(__props) {
    const notifs = useNotifs();

    const tabOptions = {
      columns: [
        {
          title: "Time",
          field: "time",
          sorter: "alphanum",
          sorterParams: { alignEmptyValues: "top" },
          formatter(cell) {
            const cellValue = cell.getData().time;
            return shortened(cellValue);
          },
          widthGrow: 1,
          resizable: true,
        },
        {
          title: "Message",
          field: "msg",
          sorter: "string",
          widthGrow: 100,
          resizable: true,
        },
      ],
      initialSort: [{ column: "time", dir: "asc" }],
      headerVisible: false,
      layout: "fitDataStretch",
      resizableColumnFit: true,
      height: "calc(25vh - 3rem)", // Must be set in order for the virtual DOM to function correctly.
      data: notifs.history,
      placeholder: "Notification history will appear here",
      selectable: false,
    };

    let tabulator = null;
    onMounted(() => {
      tabulator = new TabulatorFull("#notification_list", tabOptions);
      tabulator.on("tableBuilt", _scrollToBottom);
      tabulator.on("tableBuilt", _subscribeToPinia);
    });

    function _scrollToBottom() {
      if (notifs.empty) return;
      tabulator.scrollToRow(notifs.lastID, "bottom", false);
    }
    function _subscribeToPinia() {
      notifs.$subscribe(() => {
        tabulator.setData(notifs.history).then(_scrollToBottom);
      });
    }

    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$d);
    };
  },
};

const _hoisted_1$c = { id: "task_log_list" };

const _sfc_main$e = {
  setup(__props) {
    const taskLog = useTaskLog();
    const tasks = useTasks();

    const tabOptions = {
      columns: [
        {
          title: "Log Lines",
          field: "line",
          sorter: "string",
          widthGrow: 100,
          resizable: true,
        },
      ],
      headerVisible: false,
      layout: "fitDataStretch",
      resizableColumnFit: true,
      height: "calc(25vh - 3rem)", // Must be set in order for the virtual DOM to function correctly.
      data: taskLog.history,
      placeholder: "Task log will appear here",
      selectable: false,
    };

    let tabulator = null;
    onMounted(() => {
      tabulator = new TabulatorFull("#task_log_list", tabOptions);
      tabulator.on("tableBuilt", _scrollToBottom);
      tabulator.on("tableBuilt", _subscribeToPinia);
      _fetchLogTail(tasks.activeTaskID);
    });
    onUnmounted(() => {
      taskLog.clear();
    });

    tasks.$subscribe((_, state) => {
      _fetchLogTail(state.activeTaskID);
    });

    function _scrollToBottom() {
      if (taskLog.empty) return;
      tabulator.scrollToRow(taskLog.lastID, "bottom", false);
    }
    function _subscribeToPinia() {
      taskLog.$subscribe(() => {
        tabulator.setData(taskLog.history).then(_scrollToBottom);
      });
    }

    function _fetchLogTail(taskID) {
      taskLog.clear();

      if (!taskID) return;

      const jobsAPI = new JobsApi(getAPIClient());
      return jobsAPI.fetchTaskLogTail(taskID).then((logTail) => {
        taskLog.addChunk(logTail);
      });
    }

    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$c);
    };
  },
};

const FooterPopup_vue_vue_type_style_index_0_scoped_e5a1d06e_lang = "";

const _sfc_main$d = {
  emits: ["clickClose"],
  setup(__props, { expose, emit }) {
    const initialTab =
      localStorage.getItem("footer-popover-active-tab") || "NotificationList";
    const currentTab = ref(initialTab);
    const tabs = { NotificationList: _sfc_main$f, TaskLog: _sfc_main$e };

    watch(currentTab, async (newTab) => {
      localStorage.setItem("footer-popover-active-tab", newTab);
    });

    function showTaskLogTail() {
      currentTab.value = "TaskLog";
    }
    expose({
      showTaskLogTail,
    });

    return (_ctx, _cache) => {
      return (
        openBlock(),
        createElementBlock("footer", null, [
          createBaseVNode("nav", null, [
            createBaseVNode("ul", null, [
              createBaseVNode(
                "li",
                {
                  class: normalizeClass([
                    "footer-tab",
                    { active: currentTab.value == "NotificationList" },
                  ]),
                  onClick:
                    _cache[0] ||
                    (_cache[0] = ($event) =>
                      (currentTab.value = "NotificationList")),
                },
                " Notifications ",
                2
              ),
              createBaseVNode(
                "li",
                {
                  class: normalizeClass([
                    "footer-tab",
                    { active: currentTab.value == "TaskLog" },
                  ]),
                  onClick:
                    _cache[1] ||
                    (_cache[1] = ($event) => (currentTab.value = "TaskLog")),
                },
                " Task Log ",
                2
              ),
              createVNode(ConnectionStatus),
              createBaseVNode(
                "li",
                {
                  class: "collapse",
                  onClick:
                    _cache[2] || (_cache[2] = ($event) => emit("clickClose")),
                  title: "Collapse",
                },
                " ✕ "
              ),
            ]),
          ]),
          (openBlock(),
          createBlock(resolveDynamicComponent(tabs[currentTab.value]), {
            class: "tab",
          })),
        ])
      );
    };
  },
};
const FooterPopup = /*#__PURE__*/ _export_sfc(_sfc_main$d, [
  ["__scopeId", "data-v-e5a1d06e"],
]);

const GetTheAddon_vue_vue_type_style_index_0_scoped_d5c7ec25_lang = "";

const _withScopeId$4 = (n) => (
  pushScopeId("data-v-d5c7ec25"), (n = n()), popScopeId(), n
);
const _hoisted_1$b = { class: "details-no-item-selected" };
const _hoisted_2$b = { class: "get-the-addon" };
const _hoisted_3$a = /*#__PURE__*/ _withScopeId$4(() =>
  /*#__PURE__*/ createBaseVNode(
    "p",
    null,
    "Get the Inferix's Blender add-on and submit a job.",
    -1
  )
);
const _hoisted_4$7 = ["href"];
const _hoisted_5$7 = /*#__PURE__*/ _withScopeId$4(() =>
  /*#__PURE__*/ createBaseVNode(
    "p",
    null,
    "Use the URL below in the add-on preferences. Click on it to copy.",
    -1
  )
);

const _sfc_main$c = {
  setup(__props) {
    return (_ctx, _cache) => {
      return (
        openBlock(),
        createElementBlock("div", _hoisted_1$b, [
          createBaseVNode("div", _hoisted_2$b, [
            _hoisted_3$a,
            createBaseVNode("p", null, [
              createBaseVNode(
                "a",
                {
                  class: "btn btn-primary",
                  href: unref(backendURL)("/inferix-addon.zip"),
                },
                "Get the add-on!",
                8,
                _hoisted_4$7
              ),
            ]),
            _hoisted_5$7,
            createBaseVNode("p", null, [
              createBaseVNode(
                "span",
                {
                  class: "click-to-copy",
                  title: "Click to copy this URL",
                  onClick:
                    _cache[0] ||
                    (_cache[0] = (...args) =>
                      unref(copyElementText) &&
                      unref(copyElementText)(...args)),
                },
                toDisplayString(unref(api)()),
                1
              ),
            ]),
          ]),
        ])
      );
    };
  },
};
const GetTheAddon = /*#__PURE__*/ _export_sfc(_sfc_main$c, [
  ["__scopeId", "data-v-d5c7ec25"],
]);

const JobActionsBar_vue_vue_type_style_index_0_scoped_c161b111_lang = "";

const _sfc_main$b = {
  name: "JobActionsBar",
  props: ["activeJobID"],
  data: () => ({
    jobs: useJobs(),
    notifs: useNotifs(),
    jobsAPI: new JobsApi(getAPIClient()),

    deleteInfo: null,
  }),
  computed: {},
  watch: {
    activeJobID() {
      this._hideDeleteJobPopup();
    },
  },
  methods: {
    onButtonDelete() {
      this._startJobDeletionFlow();
    },
    onButtonDeleteConfirmed() {
      return this.jobs
        .deleteJobs()
        .then(() => {
          this.notifs.add("job marked for deletion");
        })
        .catch((error) => {
          const errorMsg = JSON.stringify(error); // TODO: handle API errors better.
          this.notifs.add(`Error: ${errorMsg}`);
        })
        .finally(this._hideDeleteJobPopup);
    },
    onButtonCancel() {
      return this._handleJobActionPromise(
        this.jobs.cancelJobs(),
        "marked for cancellation"
      );
    },
    onButtonRequeue() {
      return this._handleJobActionPromise(
        this.jobs.requeueJobs(),
        "requeueing"
      );
    },

    _handleJobActionPromise(promise, description) {
      return promise.then(() => {
        // There used to be a call to `this.notifs.add(message)` here, but now
        // that job status changes are logged in the notifications anyway,
        // it's no longer necessary.
        // This function is still kept, in case we want to bring back the
        // notifications when multiple jobs can be selected. Then a summary
        // ("N jobs requeued") could be logged here.btn-bar-popover
      });
    },

    _startJobDeletionFlow() {
      if (!this.activeJobID) {
        this.notifs.add("No active job, unable to delete anything");
        return;
      }

      this.jobsAPI
        .deleteJobWhatWouldItDo(this.activeJobID)
        .then(this._showDeleteJobPopup)
        .catch((error) => {
          const errorMsg = JSON.stringify(error); // TODO: handle API errors better.
          this.notifs.add(`Error: ${errorMsg}`);
        });
    },

    /**
     * @param { JobDeletionInfo } deleteInfo
     */
    _showDeleteJobPopup(deleteInfo) {
      this.deleteInfo = deleteInfo;
    },

    _hideDeleteJobPopup() {
      this.deleteInfo = null;
    },
  },
};
const _hoisted_1$a = { class: "btn-bar jobs" };
const _hoisted_2$a = {
  key: 0,
  class: "btn-bar-popover",
};
const _hoisted_3$9 = { key: 0 };
const _hoisted_4$6 = { key: 1 };
const _hoisted_5$6 = { class: "inner-btn-bar" };
const _hoisted_6$5 = ["disabled"];
const _hoisted_7$5 = ["disabled"];
const _hoisted_8$5 = ["disabled"];

function _sfc_render$9(_ctx, _cache, $props, $setup, $data, $options) {
  return (
    openBlock(),
    createElementBlock("div", _hoisted_1$a, [
      _ctx.deleteInfo != null
        ? (openBlock(),
          createElementBlock("div", _hoisted_2$a, [
            _ctx.deleteInfo.shaman_checkout
              ? (openBlock(),
                createElementBlock(
                  "p",
                  _hoisted_3$9,
                  "Delete job, including Shaman checkout?"
                ))
              : (openBlock(),
                createElementBlock(
                  "p",
                  _hoisted_4$6,
                  "Delete job? The job files will be kept."
                )),
            createBaseVNode("div", _hoisted_5$6, [
              createBaseVNode(
                "button",
                {
                  class: "btn cancel",
                  onClick:
                    _cache[0] ||
                    (_cache[0] = (...args) =>
                      $options._hideDeleteJobPopup &&
                      $options._hideDeleteJobPopup(...args)),
                },
                "Cancel"
              ),
              createBaseVNode(
                "button",
                {
                  class: "btn delete dangerous",
                  onClick:
                    _cache[1] ||
                    (_cache[1] = (...args) =>
                      $options.onButtonDeleteConfirmed &&
                      $options.onButtonDeleteConfirmed(...args)),
                },
                "Delete"
              ),
            ]),
          ]))
        : createCommentVNode("", true),
      createBaseVNode(
        "button",
        {
          class: "btn cancel",
          disabled: !_ctx.jobs.canCancel,
          onClick:
            _cache[2] ||
            (_cache[2] = (...args) =>
              $options.onButtonCancel && $options.onButtonCancel(...args)),
        },
        "Cancel Job",
        8,
        _hoisted_6$5
      ),
      createBaseVNode(
        "button",
        {
          class: "btn requeue",
          disabled: !_ctx.jobs.canRequeue,
          onClick:
            _cache[3] ||
            (_cache[3] = (...args) =>
              $options.onButtonRequeue && $options.onButtonRequeue(...args)),
        },
        "Requeue",
        8,
        _hoisted_7$5
      ),
      createBaseVNode(
        "button",
        {
          class: "action delete dangerous",
          title: "Mark this job for deletion, after asking for a confirmation.",
          disabled: !_ctx.jobs.canDelete,
          onClick:
            _cache[4] ||
            (_cache[4] = (...args) =>
              $options.onButtonDelete && $options.onButtonDelete(...args)),
        },
        "Delete...",
        8,
        _hoisted_8$5
      ),
    ])
  );
}
const JobActionsBar = /*#__PURE__*/ _export_sfc(_sfc_main$b, [
  ["render", _sfc_render$9],
  ["__scopeId", "data-v-c161b111"],
]);

const Search_vue_vue_type_style_index_0_scope_true_lang = "";

const _sfc_main$a = {
  name: "search",
  props: ["sPlaceholder"],
  data: () => {
    return {
      keyword: "",
    };
  },
  mounted() {},
  methods: {
    onChangeKeyword(e) {
      this.$emit("changeKeyword", e.target.value);
    },
  },
};

const _hoisted_1$9 = { class: "d-flex input-search" };
const _hoisted_2$9 = /*#__PURE__*/ createBaseVNode(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    width: "22",
    height: "22",
    viewBox: "0 0 22 22",
    fill: "none",
  },
  [
    /*#__PURE__*/ createBaseVNode("path", {
      "fill-rule": "evenodd",
      "clip-rule": "evenodd",
      d: "M3.47268 8.68399C3.47268 7.99975 3.60745 7.32221 3.8693 6.69006C4.13115 6.0579 4.51494 5.48352 4.99877 4.99969C5.4826 4.51586 6.05699 4.13206 6.68914 3.87021C7.3213 3.60837 7.99884 3.4736 8.68307 3.4736C9.36731 3.4736 10.0449 3.60837 10.677 3.87021C11.3092 4.13206 11.8835 4.51586 12.3674 4.99969C12.8512 5.48352 13.235 6.0579 13.4969 6.69006C13.7587 7.32221 13.8935 7.99975 13.8935 8.68399C13.8935 10.0659 13.3445 11.3912 12.3674 12.3683C11.3902 13.3454 10.065 13.8944 8.68307 13.8944C7.30119 13.8944 5.97591 13.3454 4.99877 12.3683C4.02163 11.3912 3.47268 10.0659 3.47268 8.68399ZM8.68307 2.11247e-08C7.32895 0.000142902 5.99362 0.316956 4.78375 0.925134C3.57389 1.53331 2.52302 2.416 1.71508 3.50269C0.907137 4.58937 0.364523 5.84995 0.130579 7.18371C-0.103365 8.51748 -0.0221558 9.88747 0.367719 11.1843C0.757594 12.481 1.44533 13.6687 2.37599 14.6523C3.30665 15.6359 4.45445 16.3883 5.72769 16.8493C7.00093 17.3103 8.36434 17.4671 9.709 17.3073C11.0537 17.1474 12.3423 16.6754 13.472 15.9288L19.0332 21.4911C19.359 21.817 19.801 22 20.2617 22C20.7225 22 21.1644 21.817 21.4902 21.4911C21.816 21.1653 21.9991 20.7234 21.9991 20.2626C21.9991 19.8019 21.816 19.36 21.4902 19.0341L15.9278 13.4729C16.7931 12.1641 17.2876 10.6453 17.3587 9.07789C17.4299 7.51051 17.0751 5.95314 16.332 4.57126C15.589 3.18939 14.4854 2.03465 13.1386 1.22976C11.7918 0.424863 10.2521 -0.0001094 8.68307 2.11247e-08Z",
      fill: "#6295F9",
    }),
  ],
  -1
);
const _hoisted_3$8 = ["placeholder"];

function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
  return (
    openBlock(),
    createElementBlock("div", _hoisted_1$9, [
      _hoisted_2$9,
      withDirectives(
        createBaseVNode(
          "input",
          {
            "onUpdate:modelValue":
              _cache[0] || (_cache[0] = ($event) => (_ctx.keyword = $event)),
            placeholder: $props.sPlaceholder,
            onInput:
              _cache[1] ||
              (_cache[1] = (...args) =>
                $options.onChangeKeyword && $options.onChangeKeyword(...args)),
          },
          null,
          40,
          _hoisted_3$8
        ),
        [[vModelText, _ctx.keyword]]
      ),
    ])
  );
}
const Search = /*#__PURE__*/ _export_sfc(_sfc_main$a, [
  ["render", _sfc_render$8],
]);

const JobBasicInfo_vue_vue_type_style_index_0_scoped_ba9bc437_lang = "";

const _sfc_main$9 = {
  name: "job-basic-info",
  props: ["jobData"],
  emits: ["selectJob"],
  components: { ApiSpinner },
  data() {
    return {
      datetime: datetime,
    };
  },
  mounted() {},

  methods: {
    selectJob() {
      this.$emit("selectJob", this.jobData);
    },
  },
};
const _hoisted_1$8 = {
  class:
    "2xl:basis-[15%] xl:basis-[20%] md:basis-[22%] max-md:basis-[25%] min-w-[80px]",
};
const _hoisted_2$8 = {
  class:
    "2xl:basis-[25%] xl:basis-[25%] md:basis-[25%] max-md:basis-[25%] truncate",
};
const _hoisted_3$7 = { class: "w-full truncate" };
const _hoisted_4$5 = {
  class:
    "2xl:basis-[25%] xl:basis-[25%] md:basis-[20%] max-md:basis-[25%] truncate",
};
const _hoisted_5$5 = { class: "w-full truncate" };
const _hoisted_6$4 = {
  class: "2xl:basis-[10%] xl:basis-[10%] md:basis-[10%] max-md:basis-[5%]",
};
const _hoisted_7$4 = {
  class:
    "2xl:basis-[20%] xl:basis-[20%] md:basis-[20%] max-md:basis-[20%] truncate",
};
const _hoisted_8$4 = { class: "w-full truncate" };

function _sfc_render$7(_ctx, _cache, $props, $setup, $data, $options) {
  const _directive_tippy = resolveDirective("tippy");

  return (
    openBlock(),
    createElementBlock(
      "div",
      {
        class: normalizeClass([
          "d-flex job-basic-info",
          {
            "job-basic-info-active":
              $props.jobData.id == _ctx.$route.params.jobID,
          },
        ]),
        onClick:
          _cache[0] ||
          (_cache[0] = (...args) =>
            $options.selectJob && $options.selectJob(...args)),
      },
      [
        createBaseVNode("div", _hoisted_1$8, [
          createBaseVNode(
            "div",
            {
              class: normalizeClass([
                "job-status max-w-[100px]",
                { "job-failed": $props.jobData.status == "failed" },
                { "job-queued": $props.jobData.status == "queued" },
                {
                  "job-completed":
                    $props.jobData.status == "completed" ||
                    $props.jobData.status == "active",
                },
              ]),
            },
            toDisplayString(
              $props.jobData.status == "active"
                ? "Active"
                : $props.jobData.status == "completed"
                ? "Completed"
                : $props.jobData.status == "failed"
                ? "Failed"
                : $props.jobData.status == "canceled"
                ? "Canceled"
                : "Queued"
            ),
            3
          ),
        ]),
        createBaseVNode("div", _hoisted_2$8, [
          withDirectives(
            (openBlock(),
            createElementBlock("div", _hoisted_3$7, [
              createTextVNode(toDisplayString($props.jobData.name), 1),
            ])),
            [[_directive_tippy, $props.jobData.name]]
          ),
        ]),
        createBaseVNode("div", _hoisted_4$5, [
          withDirectives(
            (openBlock(),
            createElementBlock("div", _hoisted_5$5, [
              createTextVNode(
                toDisplayString(
                  $props.jobData.type == "simple-blender-render"
                    ? "SimpleCyclesVideo"
                    : $props.jobData.type
                ),
                1
              ),
            ])),
            [
              [
                _directive_tippy,
                $props.jobData.type == "simple-blender-render"
                  ? "SimpleCyclesVideo"
                  : $props.jobData.type,
              ],
            ]
          ),
        ]),
        createBaseVNode(
          "div",
          _hoisted_6$4,
          toDisplayString($props.jobData.priority),
          1
        ),
        createBaseVNode("div", _hoisted_7$4, [
          withDirectives(
            (openBlock(),
            createElementBlock("div", _hoisted_8$4, [
              createTextVNode(
                toDisplayString($data.datetime.fromNow($props.jobData.updated)),
                1
              ),
            ])),
            [[_directive_tippy, $data.datetime.fromNow($props.jobData.updated)]]
          ),
        ]),
      ],
      2
    )
  );
}
const JobBasicInfo = /*#__PURE__*/ _export_sfc(_sfc_main$9, [
  ["render", _sfc_render$7],
  ["__scopeId", "data-v-ba9bc437"],
]);

const JobsTable_vue_vue_type_style_index_0_scope_true_lang = "";

const lo$4 = __vite__cjsImport0_lodash.__esModule
  ? __vite__cjsImport0_lodash.default
  : __vite__cjsImport0_lodash;

const _sfc_main$8 = {
  name: "JobsTable",
  props: ["activeJobID"],
  emits: ["tableRowClicked", "activeJobDeleted", "selectJob", "updateStatus"],
  components: {
    JobActionsBar,
    StatusFilterBar: _sfc_main$g,
    Search,
    JobBasicInfo,
    ApiSpinner,
  },
  data: () => {
    return {
      shownStatuses: [],
      availableStatuses: [], // Will be filled after data is loaded from the backend.
      deleteInfo: null,
      jobs: useJobs(),
      notifs: useNotifs(),
      jobsApi: new JobsApi(getAPIClient()),
      runningJobs: [],
      searchedRunningJobs: [],
      statusSelectedJob: "",
      isShowModal: false,
      jobName: "",
      apiQueryCount: useAPIQueryCount(),
    };
  },
  async mounted() {
    // Allow testing from the JS console:
    // jobsTableVue.processJobUpdate({id: "ad0a5a00-5cb8-4e31-860a-8a405e75910e", status: "heyy", updated: DateTime.local().toISO(), previous_status: "uuuuh", name: "Updated manually"});
    // jobsTableVue.processJobUpdate({id: "ad0a5a00-5cb8-4e31-860a-8a405e75910e", status: "heyy", updated: DateTime.local().toISO()});
    window.jobsTableVue = this;
    this.fetchAllJobs();
    this.doSearch("");
    this.fetchCurrentJob();
    window.addEventListener("resize", this.recalcTableHeight);
  },
  unmounted() {
    window.removeEventListener("resize", this.recalcTableHeight);
  },

  watch: {
    activeJobID(newJobID, oldJobID) {
      // thí.fetchAllJobs();
      return;
    },
    availableStatuses() {
      // Statuses changed, so the filter bar could have gone from "no statuses"
      // to "any statuses" (or one row of filtering stuff to two, I don't know)
      // and changed height.
      this.$nextTick(this.recalcTableHeight);
    },
  },
  computed: {
    selectedIDs() {
      return this.tabulator.getSelectedData().map((job) => job.id);
    },
  },
  methods: {
    onButtonDelete() {
      this._startJobDeletionFlow();
    },
    onButtonDeleteConfirmed() {
      return this.jobs
        .deleteJobs()
        .then(() => {
          this.fetchAllJobs();
          this.$router.push("/jobs");
          this.notifs.add("job marked for deletion");
        })
        .catch((error) => {
          const errorMsg = JSON.stringify(error); // TODO: handle API errors better.
          this.notifs.add(`Error: ${errorMsg}`);
        })
        .finally(this._hideDeleteJobPopup);
    },
    onButtonCancel() {
      return this._handleJobActionPromise(
        this.jobs.cancelJobs(),
        "marked for cancellation"
      );
    },
    onButtonRequeue() {
      this._handleJobActionPromise(this.jobs.requeueJobs(), "requeueing");
      this.$forceUpdate();
    },

    _handleJobActionPromise(promise, description) {
      return promise.then(() => {
        this.fetchAllJobs();
        this.fetchCurrentJob();
        this.$emit("updateStatus");
        //this.selectJob(jobSelected);
        // There used to be a call to `this.notifs.add(message)` here, but now
        // that job status changes are logged in the notifications anyway,
        // it's no longer necessary.
        // This function is still kept, in case we want to bring back the
        // notifications when multiple jobs can be selected. Then a summary
        // ("N jobs requeued") could be logged here.btn-bar-popover
      });
    },

    _startJobDeletionFlow() {
      let jobId = this.$route.params.jobID;
      if (!jobId) {
        this.notifs.add("No active job, unable to delete anything");
        return;
      }

      this.jobsApi
        .deleteJobWhatWouldItDo(jobId)
        .then(this._showDeleteJobPopup)
        .catch((error) => {
          const errorMsg = JSON.stringify(error); // TODO: handle API errors better.
          this.notifs.add(`Error: ${errorMsg}`);
        });
    },

    /**
     * @param { JobDeletionInfo } deleteInfo
     */
    _showDeleteJobPopup(deleteInfo) {
      this.isShowModal = deleteInfo;
    },

    _hideDeleteJobPopup() {
      this.isShowModal = false;
    },

    async fetchCurrentJob() {
      let jobId = this.$route.params.jobID;
      if (!jobId) {
        this.statusSelectedJob = "";
        return;
      }

      const job = await this.jobsApi.fetchJob(jobId);
      this.selectJob(job);
    },

    selectJob(job) {
      this.jobName = job?.name;
      this.statusSelectedJob = job.status;
      this.jobs.setActiveJob(job);
      this.$emit("selectJob", job);
    },

    doSearch(keyword) {
      let listjob =
        keyword !== ""
          ? lo$4.filter(this.runningJobs, (job) => {
              let key = keyword.toLowerCase();
              let nodeId = job.name.toLowerCase();
              return nodeId.includes(key);
            })
          : this.runningJobs;
      this.searchedRunningJobs = listjob;
    },

    onReconnected() {
      // If the connection to the backend was lost, we have likely missed some
      // updates. Just fetch the data and start from scratch.
      this.fetchAllJobs();
    },
    sortData() {
      const tab = this.tabulator;
      tab.setSort(tab.getSorters()); // This triggers re-sorting.
    },
    _onTableBuilt() {
      this.tabulator.setFilter(this._filterByStatus);
      this.fetchAllJobs();
    },

    async fetchAllJobs() {
      const jobsQuery = {};
      this.jobs.isJobless = false;

      this.jobsApi.queryJobs(jobsQuery).then(
        (data) => {
          const hasJobs = data && data.jobs && data.jobs.length > 0;
          this.jobs.isJobless = !hasJobs;
          let jobs = lo$4.map(
            lo$4.orderBy(data.jobs, ["updated"], ["desc"]),
            (job) => {
              return {
                ...job,
                ...{
                  created: new Date(job.created),
                  updated: new Date(job.updated),
                },
              };
            }
          );
          this.runningJobs = jobs;
          this.searchedRunningJobs = jobs;

          // debugger;
        },
        function (error) {
          // TODO: error handling.
          console.error(error);
        }
      );
    },
    onJobsFetched(data) {
      // "Down-cast" to JobUpdate to only get those fields, just for debugging things:
      // data.jobs = data.jobs.map((j) => API.JobUpdate.constructFromObject(j));
      const hasJobs = data && data.jobs && data.jobs.length > 0;
      this.jobs.isJobless = !hasJobs;
      this.tabulator.setData(data.jobs);
      this._refreshAvailableStatuses();

      this.recalcTableHeight();
    },
    processJobUpdate(jobUpdate) {
      const row = lo$4.findIndex(
        this.runningJobs,
        (job) => job.id == jobUpdate.id
      );

      //let promise;
      if (jobUpdate.was_deleted) {
        if (row > -1) {
          this.runningJobs[row] = {
            ...this.runningJobs[row],
            ...{},
          };
          this.runningJobs = lo$4.filter(this.runningJobs, (job) => job.id);
        } else {
          this.$emit("activeJobDeleted", jobUpdate.id);
        }
      } else {
        if (row > -1) {
          let job = {
            ...jobUpdate,
            ...{ updated: new Date(jobUpdate.updated) },
          };
          this.runningJobs[row] = {
            ...this.runningJobs[row],
            ...job,
          };
        } else {
          this.runningJobs[lo$4.size(this.runningJobs)] = jobUpdate;
        }
      }
      this.fetchAllJobs();

      this._refreshAvailableStatuses();
    },

    onRowClick(event, row) {
      // Take a copy of the data, so that it's decoupled from the tabulator data
      // store. There were some issues where navigating to another job would
      // overwrite the old job's ID, and this prevents that.
      const rowData = plain(row.getData());
      this.$emit("tableRowClicked", rowData);
    },
    toggleStatusFilter(status) {
      const asSet = new Set(this.shownStatuses);
      if (!asSet.delete(status)) {
        asSet.add(status);
      }
      this.shownStatuses = Array.from(asSet).sort();
      this.tabulator.refreshFilter();
    },
    _filterByStatus(job) {
      if (this.shownStatuses.length == 0) {
        return true;
      }
      return this.shownStatuses.indexOf(job.status) >= 0;
    },
    _refreshAvailableStatuses() {
      const statuses = new Set();
      for (let row of this.runningJobs) {
        statuses.add(row.status);
      }
      this.availableStatuses = Array.from(statuses).sort();
    },

    _reformatRow(jobID) {
      // Use tab.rowManager.findRow() instead of `tab.getRow()` as the latter
      // logs a warning when the row cannot be found.
      const row = this.tabulator.rowManager.findRow(jobID);
      if (!row) return;
      if (row.reformat) row.reformat();
      else if (row.reinitialize) row.reinitialize(true);
    },

    /**
     * Recalculate the appropriate table height to fit in the column without making that scroll.
     */
    recalcTableHeight() {
      return;
    },
  },
};

const _hoisted_1$7 = { class: "jobs-table" };
const _hoisted_2$7 = { class: "d-flex jobs-header" };
const _hoisted_3$6 = /*#__PURE__*/ createBaseVNode(
  "div",
  {
    class: "jobs-heading",
    style: { color: "rgba(162, 173, 193, 0.6) !important" },
  },
  " Running Jobs ",
  -1
);
const _hoisted_4$4 = { class: "d-flex whitespace-nowrap" };
const _hoisted_5$4 = ["disabled"];
const _hoisted_6$3 = ["disabled"];
const _hoisted_7$3 = { class: "d-flex job-table" };
const _hoisted_8$3 = /*#__PURE__*/ createStaticVNode(
  '<div class="table-header"><div class="2xl:basis-[15%] xl:basis-[20%] md:basis-[22%] max-md:basis-[25%] min-w-[80px]">Status</div><div class="2xl:basis-[25%] xl:basis-[25%] md:basis-[25%] max-md:basis-[25%]">Name</div><div class="2xl:basis-[25%] xl:basis-[25%] md:basis-[20%] max-md:basis-[25%]">Type</div><div class="2xl:basis-[10%] xl:basis-[10%] md:basis-[10%] max-md:basis-[5%]">Prio</div><div class="2xl:basis-[20%] xl:basis-[20%] md:basis-[20%] max-md:basis-[20%]">Update</div></div>',
  1
);
const _hoisted_9$3 = { class: "table-content" };
const _hoisted_10$3 = { class: "d-flex job-item" };

function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_job_basic_info = resolveComponent("job-basic-info");

  return (
    openBlock(),
    createElementBlock("div", _hoisted_1$7, [
      createBaseVNode("div", _hoisted_2$7, [
        _hoisted_3$6,
        createBaseVNode("div", _hoisted_4$4, [
          createBaseVNode(
            "button",
            {
              class: normalizeClass([
                "btn",
                [{ "btn-grey": _ctx.statusSelectedJob != "canceled" }],
              ]),
              disabled:
                _ctx.statusSelectedJob == "canceled" ||
                !_ctx.statusSelectedJob ||
                _ctx.statusSelectedJob == "completed",
              onClick:
                _cache[0] ||
                (_cache[0] = (...args) =>
                  $options.onButtonCancel && $options.onButtonCancel(...args)),
            },
            " Cancel Job ",
            10,
            _hoisted_5$4
          ),
          createBaseVNode(
            "button",
            {
              class: normalizeClass([
                "btn",
                [{ "btn-grey": _ctx.statusSelectedJob != "active" }],
              ]),
              disabled:
                _ctx.statusSelectedJob == "active" ||
                _ctx.statusSelectedJob == "queued" ||
                !_ctx.statusSelectedJob,
              style: { "margin-left": "15px" },
              onClick:
                _cache[1] ||
                (_cache[1] = (...args) =>
                  $options.onButtonRequeue &&
                  $options.onButtonRequeue(...args)),
            },
            " Requeue ",
            10,
            _hoisted_6$3
          ),
        ]),
      ]),
      createBaseVNode("div", _hoisted_7$3, [
        _hoisted_8$3,
        createBaseVNode("div", _hoisted_9$3, [
          (openBlock(true),
          createElementBlock(
            Fragment,
            null,
            renderList(_ctx.runningJobs, (job) => {
              return (
                openBlock(),
                createElementBlock("div", _hoisted_10$3, [
                  createVNode(
                    _component_job_basic_info,
                    {
                      jobData: job,
                      onSelectJob: $options.selectJob,
                    },
                    null,
                    8,
                    ["jobData", "onSelectJob"]
                  ),
                ])
              );
            }),
            256
          )),
        ]),
      ]),
    ])
  );
}
const JobsTable = /*#__PURE__*/ _export_sfc(_sfc_main$8, [
  ["render", _sfc_render$6],
]);

// 'worker' should be a Worker or TaskWorker (see schemas defined in `inferix-openapi.yaml`).

const _sfc_main$7 = {
  props: ["worker"],
  setup(__props) {
    const props = __props;

    const workerAddress = computed2(() => {
      if (props.worker.address) return `(${props.worker.address})`;
      return "";
    });

    return (_ctx, _cache) => {
      const _component_router_link = resolveComponent("router-link");

      return (
        openBlock(),
        createBlock(
          _component_router_link,
          {
            to: { name: "workers", params: { workerID: __props.worker.id } },
          },
          {
            default: withCtx(() => [
              createTextVNode(
                toDisplayString(__props.worker.name) +
                  toDisplayString(unref(workerAddress)),
                1
              ),
            ]),
            _: 1,
          },
          8,
          ["to"]
        )
      );
    };
  },
};

const TaskDetails_vue_vue_type_style_index_0_scope_true_lang = "";

const TaskDetails_vue_vue_type_style_index_1_scoped_b11220f0_lang = "";

const lo$3 = __vite__cjsImport0_lodash.__esModule
  ? __vite__cjsImport0_lodash.default
  : __vite__cjsImport0_lodash;

const _sfc_main$6 = {
  props: [
    "taskID", // Task data to show.
  ],
  emits: ["showTaskLogTail"],
  components: { LinkWorker: _sfc_main$7 },
  data() {
    return {
      datetime: datetime, // So that the template can access it.
      copyElementText: copyElementText,
      jobsApi: new JobsApi(getAPIClient()),
      notifs: useNotifs(),
      tasks: useTasks(),
      lo: lo$3,
      task: {},
    };
  },
  mounted() {
    // Allow testing from the JS console:
    window.taskDetailsVue = this;
    this.fetchTask(this.taskID);
    this.emitter.on("processTaskUpdate", this.processTaskUpdate);
  },

  unmounted() {
    this.emitter.off("processTaskUpdate", this.processTaskUpdate);
  },

  computed: {
    hasTaskData() {
      return !!this.taskID;
    },
    id() {
      return this.taskID;
    },
  },

  watch: {
    id() {
      this.fetchTask(this.taskID);
    },
  },
  methods: {
    linkToWorker() {
      this.$router.push({ path: "/workers" });
      this.emitter.emit("linkToWorker", {
        workerId: lo$3.get(this.task, "worker.id"),
        isCluster: false,
      });
    },
    processTaskUpdate(task) {
      if (task.id !== this.taskID) return;
      this.fetchTask(task.id);
    },

    fetchTask(taskID) {
      if (!taskID) {
        // There is no active task.
        return;
      }

      const jobsAPI = new JobsApi(getAPIClient());
      jobsAPI.fetchTask(taskID).then((task) => {
        this.task = task;
        return;
      });
    },

    closeTaskDetail() {
      this.tasks.setActiveTaskID([]);
      this.$emit("closeTaskDetail");
      this.emitter.emit("setDefaultBtn");
    },

    openFullLog() {
      const taskUUID = this.taskData.id;

      this.jobsApi
        .fetchTaskLogInfo(taskUUID)
        .then((logInfo) => {
          if (logInfo == null) {
            this.notifs.add(`Task ${taskUUID} has no log yet`);
            return;
          }
          console.log(`task ${taskUUID} log info:`, logInfo);

          const url = backendURL(logInfo.url);
          window.open(url, "_blank");
        })
        .catch((error) => {
          console.log(`Error fetching task ${taskUUID} log info:`, error);
        });
    },
  },
};

const _withScopeId$3 = (n) => (
  pushScopeId("data-v-b11220f0"), (n = n()), popScopeId(), n
);
const _hoisted_1$6 = {
  class: "d-flex jobs-header",
  style: { "align-items": "center" },
};
const _hoisted_2$6 = /*#__PURE__*/ _withScopeId$3(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    {
      class: "jobs-heading",
      style: { color: "rgba(162, 173, 193, 0.6) !important" },
    },
    " Task Details ",
    -1
  )
);
const _hoisted_3$5 = /*#__PURE__*/ _withScopeId$3(() =>
  /*#__PURE__*/ createBaseVNode(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "20",
      height: "20",
      viewBox: "0 0 20 20",
      fill: "none",
    },
    [
      /*#__PURE__*/ createBaseVNode("path", {
        d: "M11.3257 9.99992L15.0366 6.28898C15.2128 6.11317 15.3118 5.8746 15.312 5.62575C15.3123 5.37689 15.2136 5.13815 15.0378 4.96203C14.862 4.78591 14.6234 4.68684 14.3746 4.68662C14.1257 4.6864 13.887 4.78505 13.7109 4.96085L9.99992 8.67179L6.28898 4.96085C6.11286 4.78473 5.87399 4.68579 5.62492 4.68579C5.37585 4.68579 5.13698 4.78473 4.96085 4.96085C4.78473 5.13698 4.68579 5.37585 4.68579 5.62492C4.68579 5.87399 4.78473 6.11286 4.96085 6.28898L8.67179 9.99992L4.96085 13.7109C4.78473 13.887 4.68579 14.1258 4.68579 14.3749C4.68579 14.624 4.78473 14.8629 4.96085 15.039C5.13698 15.2151 5.37585 15.314 5.62492 15.314C5.87399 15.314 6.11286 15.2151 6.28898 15.039L9.99992 11.328L13.7109 15.039C13.887 15.2151 14.1258 15.314 14.3749 15.314C14.624 15.314 14.8629 15.2151 15.039 15.039C15.2151 14.8629 15.314 14.624 15.314 14.3749C15.314 14.1258 15.2151 13.887 15.039 13.7109L11.3257 9.99992Z",
        fill: "#A2ADC1",
      }),
    ],
    -1
  )
);
const _hoisted_4$3 = [_hoisted_3$5];
const _hoisted_5$3 = { class: "active-task-detail" };
const _hoisted_6$2 = { class: "task-setting-info" };
const _hoisted_7$2 = /*#__PURE__*/ _withScopeId$3(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "item-content-label" },
    "ID",
    -1
  )
);
const _hoisted_8$2 = { class: "item-content" };
const _hoisted_9$2 = { class: "task-setting-info" };
const _hoisted_10$2 = /*#__PURE__*/ _withScopeId$3(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "item-content-label" },
    "Name",
    -1
  )
);
const _hoisted_11$2 = { class: "item-content" };
const _hoisted_12$2 = { class: "task-setting-info font-bold" };
const _hoisted_13$2 = /*#__PURE__*/ _withScopeId$3(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "item-content-label" },
    "Status",
    -1
  )
);
const _hoisted_14$2 = { class: "task-setting-info" };
const _hoisted_15$1 = /*#__PURE__*/ _withScopeId$3(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "item-content-label" },
    "Assigned To",
    -1
  )
);
const _hoisted_16$1 = { class: "task-setting-info" };
const _hoisted_17$1 = /*#__PURE__*/ _withScopeId$3(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "item-content-label" },
    "Task Type",
    -1
  )
);
const _hoisted_18$1 = { class: "item-content" };
const _hoisted_19$1 = { class: "task-setting-info" };
const _hoisted_20$1 = /*#__PURE__*/ _withScopeId$3(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "item-content-label" },
    "Priority",
    -1
  )
);
const _hoisted_21$1 = { class: "item-content" };
const _hoisted_22$1 = { class: "task-setting-info" };
const _hoisted_23$1 = /*#__PURE__*/ _withScopeId$3(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "item-content-label" },
    "Created",
    -1
  )
);
const _hoisted_24$1 = { class: "item-content" };
const _hoisted_25$1 = { class: "task-setting-info" };
const _hoisted_26$1 = /*#__PURE__*/ _withScopeId$3(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "item-content-label" },
    "Updated",
    -1
  )
);
const _hoisted_27$1 = { class: "item-content" };
const _hoisted_28$1 = { class: "task-setting-info" };
const _hoisted_29$1 = /*#__PURE__*/ _withScopeId$3(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "item-content-label" },
    "Last Touched...",
    -1
  )
);
const _hoisted_30$1 = { class: "item-content" };
const _hoisted_31$1 = { class: "task-setting-info" };
const _hoisted_32$1 = /*#__PURE__*/ _withScopeId$3(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "item-content-label" },
    "Activity",
    -1
  )
);
const _hoisted_33$1 = { class: "item-content" };
const _hoisted_34 = { class: "task-setting-info" };
const _hoisted_35 = /*#__PURE__*/ _withScopeId$3(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "item-content-label" },
    "Reported Work",
    -1
  )
);
const _hoisted_36 = { class: "item-content" };
const _hoisted_37 = { class: "task-setting-info" };
const _hoisted_38 = /*#__PURE__*/ _withScopeId$3(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "item-content-label" },
    "PoR Work",
    -1
  )
);
const _hoisted_39 = { class: "item-content" };

function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
  return (
    openBlock(),
    createElementBlock(
      "div",
      {
        class: normalizeClass([
          "tasks-table-detail",
          { "active-element": !$options.hasTaskData },
        ]),
      },
      [
        createBaseVNode("div", _hoisted_1$6, [
          _hoisted_2$6,
          createBaseVNode(
            "div",
            {
              class: "x-btn",
              onClick:
                _cache[0] ||
                (_cache[0] = (...args) =>
                  $options.closeTaskDetail &&
                  $options.closeTaskDetail(...args)),
            },
            _hoisted_4$3
          ),
        ]),
        createBaseVNode("div", _hoisted_5$3, [
          createBaseVNode("div", _hoisted_6$2, [
            _hoisted_7$2,
            createBaseVNode(
              "div",
              _hoisted_8$2,
              toDisplayString($data.lo.get($data.task, "id")),
              1
            ),
          ]),
          createBaseVNode("div", _hoisted_9$2, [
            _hoisted_10$2,
            createBaseVNode(
              "div",
              _hoisted_11$2,
              toDisplayString($data.lo.get($data.task, "name")),
              1
            ),
          ]),
          createBaseVNode("div", _hoisted_12$2, [
            _hoisted_13$2,
            createBaseVNode(
              "div",
              {
                class: normalizeClass([
                  "task-status item-content",
                  {
                    "task-failed":
                      $data.lo.get($data.task, "status") == "failed" ||
                      $data.lo.get($data.task, "status") == "soft-failed",
                  },
                  {
                    "task-queued":
                      $data.lo.get($data.task, "status") == "queued",
                  },
                  {
                    "task-completed":
                      $data.lo.get($data.task, "status") == "completed" ||
                      $data.lo.get($data.task, "status") == "active",
                  },
                  {
                    "task-verify":
                      $data.lo.get($data.task, "status") == "verifying",
                  },
                ]),
              },
              toDisplayString($data.lo.get($data.task, "status")),
              3
            ),
          ]),
          createBaseVNode("div", _hoisted_14$2, [
            _hoisted_15$1,
            createBaseVNode(
              "div",
              {
                class: "worker-name-in-task-detail item-content",
                onClick:
                  _cache[1] ||
                  (_cache[1] = (...args) =>
                    $options.linkToWorker && $options.linkToWorker(...args)),
              },
              toDisplayString($data.lo.get($data.task, "worker.name")),
              1
            ),
          ]),
          createBaseVNode("div", _hoisted_16$1, [
            _hoisted_17$1,
            createBaseVNode(
              "div",
              _hoisted_18$1,
              toDisplayString($data.lo.get($data.task, "task_type")),
              1
            ),
          ]),
          createBaseVNode("div", _hoisted_19$1, [
            _hoisted_20$1,
            createBaseVNode(
              "div",
              _hoisted_21$1,
              toDisplayString($data.lo.get($data.task, "priority")),
              1
            ),
          ]),
          createBaseVNode("div", _hoisted_22$1, [
            _hoisted_23$1,
            createBaseVNode(
              "div",
              _hoisted_24$1,
              toDisplayString(
                $data.datetime.fromNow($data.lo.get($data.task, "created"))
              ),
              1
            ),
          ]),
          createBaseVNode("div", _hoisted_25$1, [
            _hoisted_26$1,
            createBaseVNode(
              "div",
              _hoisted_27$1,
              toDisplayString(
                $data.datetime.fromNow($data.lo.get($data.task, "updated"))
              ),
              1
            ),
          ]),
          createBaseVNode("div", _hoisted_28$1, [
            _hoisted_29$1,
            createBaseVNode(
              "div",
              _hoisted_30$1,
              toDisplayString(
                $data.datetime.fromNow($data.lo.get($data.task, "last_touched"))
              ),
              1
            ),
          ]),
          createBaseVNode("div", _hoisted_31$1, [
            _hoisted_32$1,
            createBaseVNode(
              "div",
              _hoisted_33$1,
              toDisplayString($data.lo.get($data.task, "activity")),
              1
            ),
          ]),
          createBaseVNode("div", _hoisted_34, [
            _hoisted_35,
            createBaseVNode(
              "div",
              _hoisted_36,
              toDisplayString($data.lo.get($data.task, "reported_work")) +
                " IB",
              1
            ),
          ]),
          createBaseVNode("div", _hoisted_37, [
            _hoisted_38,
            createBaseVNode(
              "div",
              _hoisted_39,
              toDisplayString($data.lo.get($data.task, "por_work")) + " IBM",
              1
            ),
          ]),
        ]),
      ],
      2
    )
  );
}
const TaskDetails = /*#__PURE__*/ _export_sfc(_sfc_main$6, [
  ["render", _sfc_render$5],
  ["__scopeId", "data-v-b11220f0"],
]);

__vite__cjsImport0_lodash.__esModule
  ? __vite__cjsImport0_lodash.default
  : __vite__cjsImport0_lodash;

const _sfc_main$5 = {
  name: "TaskActionsBar",
  props: ["filters"],
  emits: ["updateStatus", "selectTaskFilter"],
  data: () => ({
    tasks: useTasks(),
    notifs: useNotifs(),
    statusActive: "",
    choosed_filter: null,
  }),
  computed: {},
  mounted() {
    this.emitter.on("setDefaultBtn", this.setDefaultBtn);
  },

  beforeUnmount() {
    this.emitter.off("setDefaultBtn", this.setDefaultBtn);
  },

  methods: {
    setDefaultBtn(e) {
      this.statusActive = "";
    },

    onButtonCancel() {
      return this._handleTaskActionPromise(
        this.tasks.cancelTasks(),
        "cancelled"
      );
    },
    onButtonRequeue() {
      return this._handleTaskActionPromise(
        this.tasks.requeueTasks(),
        "requeueing"
      );
    },

    _handleTaskActionPromise(promise, description) {
      return promise
        .then(() => {
          this.$emit("updateStatus");
          // There used to be a call to `this.notifs.add(message)` here, but now
          // that task status changes are logged in the notifications anyway,
          // it's no longer necessary.
          // This function is still kept, in case we want to bring back the
          // notifications when multiple tasks can be selected. Then a summary
          // ("N tasks requeued") could be logged here.
        })
        .catch((error) => {
          const errorMsg = JSON.stringify(error); // TODO: handle API errors better.
          this.notifs.add(`Error: ${errorMsg}`);
        });
    },
  },
};

const _hoisted_1$5 = { class: "btn-bar tasks" };
const _hoisted_2$5 = ["disabled"];
const _hoisted_3$4 = ["disabled"];

function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
  return (
    openBlock(),
    createElementBlock("section", _hoisted_1$5, [
      createBaseVNode(
        "button",
        {
          class: normalizeClass([
            "btn cancel",
            [{ "btn-grey": _ctx.statusActive != "canceled" }],
          ]),
          disabled:
            _ctx.statusActive == "canceled" ||
            !_ctx.statusActive ||
            _ctx.statusActive == "completed",
          onClick:
            _cache[0] ||
            (_cache[0] = (...args) =>
              $options.onButtonCancel && $options.onButtonCancel(...args)),
        },
        " Cancel Task ",
        10,
        _hoisted_2$5
      ),
      createBaseVNode(
        "button",
        {
          class: normalizeClass([
            "btn requeue",
            [{ "btn-grey": _ctx.statusActive != "active" }],
          ]),
          disabled:
            _ctx.statusActive == "active" ||
            _ctx.statusActive == "queued" ||
            !_ctx.statusActive,
          onClick:
            _cache[1] ||
            (_cache[1] = (...args) =>
              $options.onButtonRequeue && $options.onButtonRequeue(...args)),
        },
        " Requeue ",
        10,
        _hoisted_3$4
      ),
    ])
  );
}
const TaskActionsBar = /*#__PURE__*/ _export_sfc(_sfc_main$5, [
  ["render", _sfc_render$4],
]);

const TaskBasicInfo_vue_vue_type_style_index_0_scoped_3c1dee6d_lang = "";

const _sfc_main$4 = {
  name: "job-basic-info",
  props: ["taskData"],
  emits: ["selectTask"],
  components: {},
  data() {
    return {
      datetime: datetime,
    };
  },
  mounted() {},

  methods: {
    selectTask() {
      this.$emit("selectTask", this.taskData);
    },
  },
};
const _hoisted_1$4 = { class: "max-lg:basis-3/12 lg:basis-2/12" };
const _hoisted_2$4 = { class: "max-lg:basis-3/12 lg:basis-3/12" };
const _hoisted_3$3 = { class: "max-lg:basis-3/12 lg:basis-3/12" };
const _hoisted_4$2 = { class: "max-lg:basis-2/12 lg:basis-2/12" };
const _hoisted_5$2 = { class: "max-lg:basis-2/12 lg:basis-2/12" };

function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
  return (
    openBlock(),
    createElementBlock(
      "div",
      {
        class: normalizeClass([
          "task-basic-info",
          {
            "task-basic-info-active":
              $props.taskData.id == _ctx.$route.params.taskID,
          },
        ]),
        onClick:
          _cache[0] ||
          (_cache[0] = (...args) =>
            $options.selectTask && $options.selectTask(...args)),
      },
      [
        createBaseVNode("div", _hoisted_1$4, [
          createBaseVNode(
            "div",
            {
              class: normalizeClass([
                "task-status",
                {
                  "task-failed":
                    $props.taskData.status == "failed" ||
                    $props.taskData.status == "soft-failed",
                },
                { "task-queued": $props.taskData.status == "queued" },
                {
                  "task-completed":
                    $props.taskData.status == "completed" ||
                    $props.taskData.status == "active",
                },
                {
                  "task-verify": $props.taskData.status == "verifying",
                },
              ]),
            },
            toDisplayString(
              $props.taskData.status == "active"
                ? "Active"
                : $props.taskData.status == "completed"
                ? "Completed"
                : $props.taskData.status == "failed"
                ? "Failed"
                : $props.taskData.status == "soft-failed"
                ? "Soft-failed"
                : $props.taskData.status == "canceled"
                ? "Canceled"
                : $props.taskData.status == "verifying"
                ? "Verifying"
                : "Queued"
            ),
            3
          ),
        ]),
        createBaseVNode(
          "div",
          _hoisted_2$4,
          toDisplayString($props.taskData.name),
          1
        ),
        createBaseVNode(
          "div",
          _hoisted_3$3,
          toDisplayString($data.datetime.fromNow($props.taskData.updated)),
          1
        ),
        createBaseVNode(
          "div",
          _hoisted_4$2,
          toDisplayString($props.taskData.reported_work) + " IB ",
          1
        ),
        createBaseVNode(
          "div",
          _hoisted_5$2,
          toDisplayString($props.taskData.por_work) + " IBM ",
          1
        ),
      ],
      2
    )
  );
}
const TaskBasicInfo = /*#__PURE__*/ _export_sfc(_sfc_main$4, [
  ["render", _sfc_render$3],
  ["__scopeId", "data-v-3c1dee6d"],
]);

const dropdown = "";

const lo$2 = __vite__cjsImport0_lodash.__esModule
  ? __vite__cjsImport0_lodash.default
  : __vite__cjsImport0_lodash;
const Dropdown = /* @__PURE__ */ defineComponent({
  name: "dropdown",
  data() {
    return {
      showMenu: false,
      rawHtmlItem: "",
      searchedKey: "",
      searchedItems: [],
    };
  },
  emits: ["chooseItem"],
  props: [
    "items",
    //List item in dropdown
    "width",
    //Width of dropdown menu
    "mode",
    //Dark or light
    "right",
    "arrow",
    "position",
    "selected_item",
    "default_value",
    "custom",
    //Show or hide input search in dropdown
    "limit",
    //Max item in dropdown menu on 1 view
    "size", //Height of item in dropdown menu
  ],
  watch: {
    items(newItems, oldItems) {
      this.searchedItems = newItems;
    },
  },
  mounted() {
    this.searchedItems = this.items;
  },
  methods: {
    onInput(e) {
      this.searchedKey = e.target.value;
      this.doSearch();
    },
    doSearch() {
      let keyword = this.searchedKey.toLowerCase();
      let items = lo$2.filter(this.items, (item) =>
        item.value.toLowerCase().includes(keyword)
      );
      this.searchedItems = items;
    },
    toggleShow() {
      this.showMenu = !this.showMenu;
      setTimeout(() => this.$refs.search && this.$refs.search.focus());
    },
    clickItem(item) {
      if (lo$2.get(this.selected_item, "id") == item.id) return;
      this.toggleShow();
      this.$emit("chooseItem", item);
    },
    onClickAway() {
      if (!this.showMenu) return;
      this.showMenu = false;
    },
    renderItem(item) {
      if (lo$2.get(item, "icon")) {
        return createVNode(Fragment, null, [
          lo$2.get(item, "icon"),
          createVNode("div", null, [lo$2.get(item, "value")]),
        ]);
      }
      return createVNode("div", null, [lo$2.get(item, "value")]);
    },
    renderDefaultValue() {
      if (this.default_value == {}) return null;
      if (!this.selected_item) return this.renderItem(this.default_value);
      let item = lo$2.find(
        this.items,
        (ite) => ite.id == this.selected_item.id
      );
      return this.renderItem(item);
    },
  },
  render() {
    let cls = "dropdown-background";
    let menu_height;
    if (this.limit) menu_height = this.limit * 26;
    if (this.limit && this.size) menu_height = this.limit * this.size;
    if (this.right) cls += " menu-right";
    let dark_background = "";
    let dark_menu_item = "";
    let height_item;
    if (this.size) height_item = `height: ${this.size}px;`;
    if (this.mode == "dark") {
      dark_background = "dark_background";
      dark_menu_item = "dark_menu_item";
    }
    return createVNode(
      "div",
      {
        class: cls,
      },
      [
        createVNode(
          "div",
          {
            class: "absolute top-0 left-0 w-full h-full",
          },
          [
            createVNode(
              "button",
              {
                onClick: () => this.toggleShow(),
                class: "anchor",
              },
              [
                this.renderDefaultValue() || "Select an item",
                createVNode(
                  "div",
                  {
                    style: "flex: 1",
                  },
                  null
                ),
                this.arrow &&
                  createVNode(
                    "svg",
                    {
                      xmlns: "http://www.w3.org/2000/svg",
                      width: "9",
                      height: "8",
                      viewBox: "0 0 9 8",
                      fill: "none",
                    },
                    [
                      createVNode(
                        "path",
                        {
                          d: "M5.31622 7.14502C4.93132 7.81169 3.96907 7.81169 3.58417 7.14502L0.395354 1.62183C0.0104539 0.95516 0.49158 0.121827 1.26138 0.121827L7.63901 0.121828C8.40881 0.121828 8.88994 0.955161 8.50504 1.62183L5.31622 7.14502Z",
                          fill: "white",
                        },
                        null
                      ),
                    ]
                  ),
              ]
            ),
            this.showMenu &&
              withDirectives(
                createVNode(
                  "div",
                  {
                    class: `menu ${dark_background}`,
                    style: `width: ${this.width}px; height:${menu_height}px; position:${this.position}`,
                  },
                  [
                    createVNode(
                      "div",
                      {
                        style: `border-radius: 8px; ${
                          this.mode == "inferix" &&
                          "border: 1px solid #959BAB; background: #304060"
                        }`,
                        class: `${menu_height && "menu_scroll"}`,
                      },
                      [
                        this.custom &&
                          createVNode(
                            "div",
                            {
                              class: "menu-item menu-item-input",
                              style: height_item,
                            },
                            [
                              createVNode(
                                "input",
                                {
                                  ref: "search",
                                  value: this.searchedKey,
                                  placeholder: "Search...",
                                  onInput: this.onInput,
                                },
                                null
                              ),
                            ]
                          ),
                        lo$2.map(this.searchedItems, (item) => {
                          return createVNode(
                            "div",
                            {
                              class: `menu-item ${
                                this.mode == "inferix" && "menu-item-inferix"
                              } ${
                                lo$2.get(this.selected_item, "id") == item.id
                                  ? "menu-item-disabled"
                                  : ""
                              } ${dark_menu_item}`,
                              style: height_item,
                              onClick: () => this.clickItem(item),
                            },
                            [this.renderItem(item)]
                          );
                        }),
                      ]
                    ),
                  ]
                ),
                [[resolveDirective("click-away"), this.onClickAway]]
              ),
          ]
        ),
      ]
    );
  },
});

const TasksTable_vue_vue_type_style_index_0_scoped_503041c1_lang = "";

const lo$1 = __vite__cjsImport0_lodash.__esModule
  ? __vite__cjsImport0_lodash.default
  : __vite__cjsImport0_lodash;

const _sfc_main$3 = {
  emits: ["tableRowClicked", "selectTask", "updateStatus"],
  props: [
    "jobID", // ID of the job of which the tasks are shown here.
    "taskID", // The active task.
  ],
  components: {
    TaskActionsBar,
    StatusFilterBar: _sfc_main$g,
    TaskBasicInfo,
    Dropdown,
  },

  data: () => {
    return {
      tasks: useTasks(),
      shownStatuses: [],
      availableStatuses: [], // Will be filled after data is loaded from the backend.
      allTasks: [],
      showed_tasks: [],
      total_task: 0,
      displaySize: {
        width: 0,
        height: 0,
      },
      filter: "",
      choosed_filter: "",
      filters: [{ id: "all", value: "All" }],
    };
  },
  mounted() {
    // Allow testing from the JS console:
    // tasksTableVue.processTaskUpdate({id: "ad0a5a00-5cb8-4e31-860a-8a405e75910e", status: "heyy", updated: DateTime.local().toISO(), previous_status: "uuuuh", name: "Updated manually"});
    // tasksTableVue.processTaskUpdate({id: "ad0a5a00-5cb8-4e31-860a-8a405e75910e", status: "heyy", updated: DateTime.local().toISO()});
    window.tasksTableVue = this;

    // this.tabulator = new Tabulator("#flamenco_task_list", options);
    // this.tabulator.on("rowClick", this.onRowClick);
    // this.tabulator.on("tableBuilt", this._onTableBuilt);
    this.fetchTasks();
    this.fetchCurrentTask();
    this.resize();

    window.addEventListener("resize", this.recalcTableHeight);
    window.addEventListener("resize", this.resize);
    this.emitter.on("processTaskUpdate", this.processTaskUpdate);
  },
  unmounted() {
    window.removeEventListener("resize", this.recalcTableHeight);
    window.removeEventListener("resize", this.resize);
    this.emitter.off("processTaskUpdate", this.processTaskUpdate);
  },
  watch: {
    jobID() {
      this.filters = [{ id: "all", value: "All" }];
      this.choosed_filter = "";
      this.filter = "";
      this.fetchTasks();
    },
    taskID(oldID, newID) {
      this._reformatRow(oldID);
      this._reformatRow(newID);
    },
    availableStatuses() {
      // Statuses changed, so the filter bar could have gone from "no statuses"
      // to "any statuses" (or one row of filtering stuff to two, I don't know)
      // and changed height.
      this.$nextTick(this.recalcTableHeight);
    },
  },
  methods: {
    resize() {
      let app = document.getElementById("app");
      this.displaySize = {
        width: app.offsetWidth,
        height: app.offsetHeight,
      };
    },

    chooseFilter(e) {
      this.choosed_filter = e;
      this.onSelectTaskFilter(lo$1.get(e, "id"));
    },

    selectTask(task) {
      this.$refs.TaskActionsBar.statusActive = task.status;
      this.$emit("selectTask", task);
    },
    async updateStatus() {
      this.fetchTasks();
      const taskApi = new JobsApi(getAPIClient());
      const task = await taskApi.fetchTask(this.tasks.$state.activeTaskID);
      if (!task) return;
      this.$refs.TaskActionsBar.statusActive = task.status;
      this.$emit("updateStatus");
    },

    onSelectTaskFilter(filter) {
      if (filter !== "all") this.filter = filter;
      else this.filter = "";
      if (filter == "all") {
        this.showed_tasks = this.allTasks;
        return;
      }

      this.showed_tasks = lo$1.filter(
        this.allTasks,
        (task) => task.status == filter
      );
    },

    onReconnected() {
      // If the connection to the backend was lost, we have likely missed some
      // updates. Just fetch the data and start from scratch.
      this.fetchTasks();
      this.fetchCurrentTask();
    },
    sortData() {
      const tab = this.tabulator;
      tab.setSort(tab.getSorters()); // This triggers re-sorting.
    },
    _onTableBuilt() {
      this.tabulator.setFilter(this._filterByStatus);
      this.fetchTasks();
    },
    fetchTasks() {
      if (!this.jobID) {
        // this.tabulator.setData([]);
        this.allTasks = [];
        this.showed_tasks = this.allTasks;
        return;
      }

      const jobsApi = new JobsApi(getAPIClient());
      jobsApi.fetchJobTasks(this.jobID).then((data) => {
        let tasks = data.tasks;
        tasks = lo$1.orderBy(tasks, ["updated"], ["desc"]);
        this.allTasks = lo$1.map(tasks, (task) => {
          return { ...task, ...{ updated: new Date(task.updated) } };
        });
        this.showed_tasks = this.allTasks;
        let filters = [];
        lo$1.forEach(this.allTasks, (task) => {
          if (!lo$1.find(filters, (f) => f.id == task.status))
            filters.push({
              id: task.status,
              value: task.status.charAt(0).toUpperCase() + task.status.slice(1),
            });
        });
        filters = lo$1.orderBy(filters, ["id"], ["asc"]);
        this.filters = [...this.filters, ...filters];

        this.total_task = lo$1.size(data.tasks);
      });
    },

    async fetchCurrentTask() {
      let taskId = this.$route.params.taskID;
      if (!taskId) {
        return;
      }

      const jobsAPI = new JobsApi(getAPIClient());
      const task = await jobsAPI.fetchTask(taskId);
      this.selectTask(task);
    },
    onTasksFetched(data) {
      // "Down-cast" to TaskUpdate to only get those fields, just for debugging things:
      // let tasks = data.tasks.map((j) => API.TaskUpdate.constructFromObject(j));
      this.tabulator.setData(data.tasks);
      this._refreshAvailableStatuses();

      this.recalcTableHeight();
    },
    processTaskUpdate(taskUpdate) {
      const row = lo$1.findIndex(
        this.allTasks,
        (task) => task.id == taskUpdate.id
      );

      this.allTasks[row] = {
        ...this.allTasks[row],
        ...taskUpdate,
      };
      this.allTasks = lo$1.orderBy(this.allTasks, ["updated"], ["desc"]);

      if (this.filter)
        this.showed_tasks = lo$1.filter(
          this.allTasks,
          (task) => task.status == this.filter
        );
      else this.showed_tasks = this.allTasks;

      this._refreshAvailableStatuses();
    },

    onRowClick(event, row) {
      // Take a copy of the data, so that it's decoupled from the tabulator data
      // store. There were some issues where navigating to another job would
      // overwrite the old job's ID, and this prevents that.
      const rowData = plain(row.getData());
      this.$emit("tableRowClicked", rowData);
    },
    toggleStatusFilter(status) {
      const asSet = new Set(this.shownStatuses);
      if (!asSet.delete(status)) {
        asSet.add(status);
      }
      this.shownStatuses = Array.from(asSet).sort();
      this.tabulator.refreshFilter();
    },
    _filterByStatus(tableItem) {
      if (this.shownStatuses.length == 0) {
        return true;
      }
      return this.shownStatuses.indexOf(tableItem.status) >= 0;
    },
    _refreshAvailableStatuses() {
      const statuses = new Set();
      for (let row of this.allTasks) {
        statuses.add(row.status);
      }
      this.availableStatuses = Array.from(statuses).sort();
    },

    _reformatRow(jobID) {
      // Use tab.rowManager.findRow() instead of `tab.getRow()` as the latter
      // logs a warning when the row cannot be found.
      const row = this.tabulator.rowManager.findRow(jobID);
      if (!row) return;
      if (row.reformat) row.reformat();
      else if (row.reinitialize) row.reinitialize(true);
    },

    /**
     * Recalculate the appropriate table height to fit in the column without making that scroll.
     */
    recalcTableHeight() {
      return;
    },
  },
};

const _withScopeId$2 = (n) => (
  pushScopeId("data-v-503041c1"), (n = n()), popScopeId(), n
);
const _hoisted_1$3 = { class: "sub-title task-title" };
const _hoisted_2$3 = /*#__PURE__*/ _withScopeId$2(() =>
  /*#__PURE__*/ createBaseVNode("div", { style: { flex: "1" } }, null, -1)
);
const _hoisted_3$2 = { key: 0 };
const _hoisted_4$1 = { class: "btn-bar-group" };
const _hoisted_5$1 = { class: "btn-bar-group btn-group-mobile" };
const _hoisted_6$1 = { class: "task-table" };
const _hoisted_7$1 = {
  class: "task-table-header",
  style: { height: "42px" },
};
const _hoisted_8$1 = /*#__PURE__*/ _withScopeId$2(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "max-lg:basis-3/12 lg:basis-2/12" },
    "Status",
    -1
  )
);
const _hoisted_9$1 = /*#__PURE__*/ _withScopeId$2(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "max-lg:basis-3/12 lg:basis-3/12" },
    "Name",
    -1
  )
);
const _hoisted_10$1 = /*#__PURE__*/ _withScopeId$2(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "max-lg:basis-3/12 lg:basis-3/12" },
    "Updated",
    -1
  )
);
const _hoisted_11$1 = { class: "max-lg:basis-2/12 lg:basis-2/12" };
const _hoisted_12$1 = { class: "max-lg:basis-2/12 lg:basis-2/12" };
const _hoisted_13$1 = { class: "task-table-content" };
const _hoisted_14$1 = { class: "d-flex job-item" };

function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_Dropdown = resolveComponent("Dropdown");
  const _component_task_actions_bar = resolveComponent("task-actions-bar");
  const _component_task_basic_info = resolveComponent("task-basic-info");

  return (
    openBlock(),
    createElementBlock(
      Fragment,
      null,
      [
        createBaseVNode("div", _hoisted_1$3, [
          createBaseVNode(
            "div",
            null,
            "Tasks (" + toDisplayString(_ctx.total_task) + ")",
            1
          ),
          _hoisted_2$3,
          _ctx.filter
            ? (openBlock(),
              createElementBlock(
                "div",
                _hoisted_3$2,
                "Total: " + toDisplayString(_ctx.showed_tasks.length),
                1
              ))
            : createCommentVNode("", true),
          createVNode(
            _component_Dropdown,
            {
              items: _ctx.filters,
              mode: "dark",
              arrow: true,
              default_value: { id: "0", value: "Select status" },
              selected_item: _ctx.choosed_filter,
              size: 30,
              onChooseItem: $options.chooseFilter,
              class: "filter_task",
            },
            null,
            8,
            ["items", "selected_item", "onChooseItem"]
          ),
          createBaseVNode("div", _hoisted_4$1, [
            createVNode(
              _component_task_actions_bar,
              {
                filters: _ctx.filters,
                ref: "TaskActionsBar",
                onUpdateStatus: $options.updateStatus,
              },
              null,
              8,
              ["filters", "onUpdateStatus"]
            ),
          ]),
        ]),
        createBaseVNode("div", _hoisted_5$1, [
          createVNode(
            _component_task_actions_bar,
            {
              filters: _ctx.filters,
              ref: "TaskActionsBar",
              onUpdateStatus: $options.updateStatus,
            },
            null,
            8,
            ["filters", "onUpdateStatus"]
          ),
        ]),
        createBaseVNode("div", _hoisted_6$1, [
          createBaseVNode("div", _hoisted_7$1, [
            _hoisted_8$1,
            _hoisted_9$1,
            _hoisted_10$1,
            createBaseVNode(
              "div",
              _hoisted_11$1,
              toDisplayString(
                _ctx.displaySize.width <= 1280 ? "RW" : "Reported Work"
              ),
              1
            ),
            createBaseVNode(
              "div",
              _hoisted_12$1,
              toDisplayString(
                _ctx.displaySize.width <= 1280 ? "PW" : "PoR Work"
              ),
              1
            ),
          ]),
          createBaseVNode("div", _hoisted_13$1, [
            (openBlock(true),
            createElementBlock(
              Fragment,
              null,
              renderList(_ctx.showed_tasks, (task) => {
                return (
                  openBlock(),
                  createElementBlock("div", _hoisted_14$1, [
                    createVNode(
                      _component_task_basic_info,
                      {
                        taskData: task,
                        onSelectTask: $options.selectTask,
                      },
                      null,
                      8,
                      ["taskData", "onSelectTask"]
                    ),
                  ])
                );
              }),
              256
            )),
          ]),
        ]),
      ],
      64
    )
  );
}
const TasksTable = /*#__PURE__*/ _export_sfc(_sfc_main$3, [
  ["render", _sfc_render$2],
  ["__scopeId", "data-v-503041c1"],
]);

const RenderedImageMobile_vue_vue_type_style_index_0_scoped_e5c42dac_lang = "";

const _hoisted_1$2 = { class: "flex justify-center mx-auto" };
const _hoisted_2$2 = ["src"];
const _hoisted_3$1 = {
  key: 1,
  class: "!bg-[#000]",
  src: _imports_0,
  alt: "Last-rendered image for this job",
};

const _sfc_main$2 = {
  props: [
    /* The job UUID to show renders for, or some false-y value if renders from all
     * jobs should be accepted. */
    "jobID",
    /* Name of the thumbnail, or subset thereof. See `JobLastRenderedImageInfo` in
     * `inferix-openapi.yaml`, and * `internal/manager/last_rendered/last_rendered.go`.
     * The component picks the 'suffix' that has the given `thumbnailSuffix` as
     * substring. */
    "thumbnailSuffix",
  ],
  setup(__props, { expose }) {
    const props = __props;

    const imageURL = ref("");
    const cssClasses = reactive({
      "nothing-rendered-yet": true,
    });

    const jobsApi = new JobsApi(getAPIClient());
    let nothing_rendered = true;

    /**
     * Fetches the last-rendered info for the given job, then updates the <img> tag for it.
     */
    function fetchImageURL(jobID) {
      let promise;
      if (jobID) promise = jobsApi.fetchJobLastRenderedInfo(jobID);
      else promise = jobsApi.fetchGlobalLastRenderedInfo();

      promise.then(setImageURL).catch((error) => {
        console.warn("error fetching last-rendered image info:", error);
      });
    }

    /**
     * @param {JobLastRenderedImageInfo} thumbnailInfo
     */
    function setImageURL(thumbnailInfo) {
      if (thumbnailInfo == null) {
        // This indicates that there is no last-rendered image.
        // Default to a hard-coded 'nothing to be seen here, move along' image.
        //imageURL.value = `${env.VITE_API_PROTOCAL}//${env.VITE_API_BASE_URL}/app/nothing-rendered-yet.svg`;
        //imageUrl = "@/assets/images/nothing-rendered-yet.svg";
        nothing_rendered = true;
        return;
      } else nothing_rendered = false;

      // Set the image URL to something appropriate.
      let foundThumbnail = false;
      const suffixToFind = props.thumbnailSuffix;
      for (let suffix of thumbnailInfo.suffixes) {
        if (!suffix.includes(suffixToFind)) continue;

        // This uses the API URL to construct the image URL, as the image comes from
        // Flamenco Manager, and not from any development server that might be
        // serving the webapp.
        let url = new URL(api());
        url.pathname = thumbnailInfo.base + "/" + suffix;
        url.search = new Date().getTime(); // This forces the image to be reloaded.
        imageURL.value = url.toString();
        foundThumbnail = true;
        break;
      }
      if (!foundThumbnail) {
        console.warn(
          `LastRenderedImage.vue: could not find thumbnail with suffix "${suffixToFind}"; available are:`,
          thumbnailInfo.suffixes
        );
      }
      cssClasses["nothing-rendered-yet"] = !foundThumbnail;
    }

    /**
     * @param {SocketIOLastRenderedUpdate} lastRenderedUpdate
     */
    function refreshLastRenderedImage(lastRenderedUpdate) {
      // Only filter out other job IDs if this component has actually a non-empty job ID.
      if (props.jobID && lastRenderedUpdate.job_id != props.jobID) {
        console.log(
          "LastRenderedImage.vue: refreshLastRenderedImage() received update for job",
          lastRenderedUpdate.job_id,
          "but this component is showing job",
          props.jobID
        );
        return;
      }

      setImageURL(lastRenderedUpdate.thumbnail);
    }

    // Call fetchImageURL(jobID) whenever the job ID prop changes value.
    watch(
      () => props.jobID,
      (newJobID) => {
        fetchImageURL(newJobID);
      }
    );
    fetchImageURL(props.jobID);

    // Expose refreshLastRenderedImage() so that it can be called from the parent
    // component in response to SocketIO messages.
    expose({
      refreshLastRenderedImage,
    });

    return (_ctx, _cache) => {
      return (
        openBlock(),
        createElementBlock("div", _hoisted_1$2, [
          !unref(nothing_rendered)
            ? (openBlock(),
              createElementBlock(
                "img",
                {
                  key: 0,
                  class: "!bg-[#000]",
                  src: imageURL.value,
                  alt: "Last-rendered image for this job",
                },
                null,
                8,
                _hoisted_2$2
              ))
            : (openBlock(), createElementBlock("img", _hoisted_3$1)),
        ])
      );
    };
  },
};
const RenderedImageMobile = /*#__PURE__*/ _export_sfc(_sfc_main$2, [
  ["__scopeId", "data-v-e5c42dac"],
]);

const JobDetail_vue_vue_type_style_index_0_scoped_c88b9322_lang = "";

const _sfc_main$1 = {
  name: "job-detail",
  props: ["jobData"],
  emits: ["selectTask", "reshuffled"],
  components: {
    RenderedImageMobile,
    LastRenderedImage,
    TaskTable: TasksTable,
  },
  data: () => {
    return {
      datetime: datetime, // So that the template can access it.
      copyElementText: copyElementText,
      copyElementData: copyElementData,
      simpleSettings: null, // Object with filtered job settings, or null if there is no job.
      jobsApi: new JobsApi(getAPIClient()),
      jobType: null, // API.AvailableJobType object for the current job type.
      jobTypeSettings: null, // Mapping from setting key to its definition in the job type.
      showAllSettings: false,
      workers: useWorkers(),
      TaskTable: TasksTable,
    };
  },
  mounted() {},

  computed: {
    hasJobData() {
      return !!this.jobData && !!this.jobData.id;
    },
  },

  watch: {
    jobData(newJobData) {
      // This can be called when moving from "a job" to "no job", in which case there is no ID.
      if (!newJobData || !newJobData.id) return;
      this._refreshJobSettings(newJobData);
    },
  },

  methods: {
    selectTask(task) {
      this.$emit("selectTask", task);
    },
    updateStatus() {
      this.$refs.TaskTable.fetchTasks();
    },
    updateStatusDetails() {
      this.$emit("updateStatusDetails");
    },
    refreshLastRenderedImage(lastRenderedUpdate) {
      this.$refs.lastRenderedImage.refreshLastRenderedImage(lastRenderedUpdate);
    },

    _refreshJobSettings(newJobData) {
      if (objectEmpty(newJobData)) {
        this._clearJobSettings();
        return;
      }

      // Only fetch the job type if it's different from what's already loaded.
      if (objectEmpty(this.jobType) || this.jobType.name != newJobData.type) {
        this._clearJobSettings(); // They should only be shown when the type info is known.

        this.jobsApi
          .getJobType(newJobData.type)
          .then(this.onJobTypeLoaded)
          .catch((error) => {
            console.warn("error fetching job type:", error);
          });
      } else {
        this._setJobSettings(newJobData.settings);
      }
    },

    onJobTypeLoaded(jobType) {
      this.jobType = jobType;

      // Construct a lookup table for the settings.
      const jobTypeSettings = {};
      for (let setting of jobType.settings)
        jobTypeSettings[setting.key] = setting;
      this.jobTypeSettings = jobTypeSettings;

      if (this.jobData) {
        this._setJobSettings(this.jobData.settings);
      }
      this.$emit("reshuffled");
    },

    _clearJobSettings() {
      this.simpleSettings = null;
      this.$emit("reshuffled");
    },

    _setJobSettings(newJobSettings) {
      if (objectEmpty(newJobSettings)) {
        this._clearJobSettings();
        return;
      }

      if (objectEmpty(this.jobTypeSettings)) {
        console.warn("empty job type settings");
        this._clearJobSettings();
        return;
      }

      // Construct a set of `setting.visible` values that should make the
      // setting visible here in the web interface.
      const v = new AvailableJobSettingVisibility();
      const visible = new Set([undefined, v.visible, v.web]);

      const filtered = {};
      for (let key in newJobSettings) {
        const setting = this.jobTypeSettings[key];
        if (typeof setting == "undefined") {
          // Jobs can have settings beyond what the job type defines, for
          // example when the job is older than the latest change to a job type,
          // or when the submission system simply added custom settings.
          continue;
        }
        if (visible.has(setting.visible)) {
          filtered[key] = newJobSettings[key];
        }
      }

      this.simpleSettings = filtered;
      this.$emit("reshuffled");
    },
    emit_reshuffled_delayed() {
      const reshuffle = () => {
        this.$emit("reshuffled");
      };

      // Changing tabs requires two sequential "reshuffled" events, at least it
      // does on Firefox. Not sure what the reason is, but it works to get rid
      // of the scrollbar.
      reshuffle();
      this.$nextTick(reshuffle);
    },
  },
};

const _withScopeId$1 = (n) => (
  pushScopeId("data-v-c88b9322"), (n = n()), popScopeId(), n
);
const _hoisted_1$1 = {
  key: 0,
  class: "detail-job",
};
const _hoisted_2$1 = { class: "d-flex job-info" };
const _hoisted_3 = {
  class:
    "basis-[40%] relative flex justify-center max-w-[500px] rounded-[3px] w-full",
};
const _hoisted_4 = { class: "max-md:hidden w-full" };
const _hoisted_5 = { class: "md:hidden w-full" };
const _hoisted_6 = {
  class:
    "basis-[60%] flex flex-col w-full items-center mx-auto justify-center sm:min-w-[340px]",
};
const _hoisted_7 = { class: "job-setting-info" };
const _hoisted_8 = /*#__PURE__*/ _withScopeId$1(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "basis-2/12 text-end font-semibold" },
    "ID",
    -1
  )
);
const _hoisted_9 = { class: "basis-10/12 xl:whitespace-nowrap" };
const _hoisted_10 = { class: "job-setting-info" };
const _hoisted_11 = /*#__PURE__*/ _withScopeId$1(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "basis-2/12 text-end font-semibold" },
    "Name",
    -1
  )
);
const _hoisted_12 = {
  class: "basis-10/12 overflow-hidden whitespace-pre-line break-all",
};
const _hoisted_13 = { class: "job-setting-info" };
const _hoisted_14 = /*#__PURE__*/ _withScopeId$1(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "basis-2/12 text-end font-semibold" },
    "Status",
    -1
  )
);
const _hoisted_15 = { class: "job-setting-info" };
const _hoisted_16 = /*#__PURE__*/ _withScopeId$1(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "basis-2/12 text-end font-semibold" },
    "Type",
    -1
  )
);
const _hoisted_17 = { class: "basis-10/12" };
const _hoisted_18 = { class: "job-setting-info" };
const _hoisted_19 = /*#__PURE__*/ _withScopeId$1(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "basis-2/12 text-end font-semibold" },
    "Priority",
    -1
  )
);
const _hoisted_20 = { class: "basis-10/12" };
const _hoisted_21 = { class: "job-setting-info" };
const _hoisted_22 = /*#__PURE__*/ _withScopeId$1(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "basis-2/12 text-end font-semibold" },
    "Created",
    -1
  )
);
const _hoisted_23 = { class: "basis-10/12" };
const _hoisted_24 = { class: "job-setting-info" };
const _hoisted_25 = /*#__PURE__*/ _withScopeId$1(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "basis-2/12 text-end font-semibold" },
    "Updated",
    -1
  )
);
const _hoisted_26 = { class: "basis-10/12" };
const _hoisted_27 = { class: "job-setting-info" };
const _hoisted_28 = /*#__PURE__*/ _withScopeId$1(() =>
  /*#__PURE__*/ createBaseVNode(
    "div",
    { class: "basis-2/12 text-end font-semibold" },
    "Activity",
    -1
  )
);
const _hoisted_29 = { class: "basis-10/12" };
const _hoisted_30 = { class: "list-task-table" };
const _hoisted_31 = {
  key: 1,
  class: "details-no-item-selected",
};
const _hoisted_32 = /*#__PURE__*/ _withScopeId$1(() =>
  /*#__PURE__*/ createBaseVNode(
    "p",
    null,
    "Select a job to see its details.",
    -1
  )
);
const _hoisted_33 = [_hoisted_32];

function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_last_rendered_image = resolveComponent(
    "last-rendered-image"
  );
  const _component_rendered_image_mobile = resolveComponent(
    "rendered-image-mobile"
  );
  const _component_task_table = resolveComponent("task-table");

  return $options.hasJobData
    ? (openBlock(),
      createElementBlock("div", _hoisted_1$1, [
        createBaseVNode("div", _hoisted_2$1, [
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("div", _hoisted_4, [
              createVNode(
                _component_last_rendered_image,
                {
                  ref: "lastRenderedImage",
                  jobID: $props.jobData.id,
                  thumbnailSuffix: "small",
                },
                null,
                8,
                ["jobID"]
              ),
            ]),
            createBaseVNode("div", _hoisted_5, [
              createVNode(
                _component_rendered_image_mobile,
                {
                  ref: "lastRenderedImage",
                  jobID: $props.jobData.id,
                  thumbnailSuffix: "small",
                },
                null,
                8,
                ["jobID"]
              ),
            ]),
          ]),
          createBaseVNode("div", _hoisted_6, [
            createBaseVNode("div", _hoisted_7, [
              _hoisted_8,
              createBaseVNode(
                "div",
                _hoisted_9,
                toDisplayString($props.jobData.id),
                1
              ),
            ]),
            createBaseVNode("div", _hoisted_10, [
              _hoisted_11,
              createBaseVNode(
                "div",
                _hoisted_12,
                toDisplayString($props.jobData.name),
                1
              ),
            ]),
            createBaseVNode("div", _hoisted_13, [
              _hoisted_14,
              createBaseVNode(
                "div",
                {
                  class: normalizeClass([
                    "basis-10/12 ",
                    "job-setting-status",
                    {
                      "job-status-completed":
                        $props.jobData.status == "completed" ||
                        $props.jobData.status == "active",
                    },
                    { "job-status-queued": $props.jobData.status == "queued" },
                    { "job-status-failed": $props.jobData.status == "failed" },
                  ]),
                },
                toDisplayString($props.jobData.status),
                3
              ),
            ]),
            createBaseVNode("div", _hoisted_15, [
              _hoisted_16,
              createBaseVNode(
                "div",
                _hoisted_17,
                toDisplayString($props.jobData.type),
                1
              ),
            ]),
            createBaseVNode("div", _hoisted_18, [
              _hoisted_19,
              createBaseVNode(
                "div",
                _hoisted_20,
                toDisplayString($props.jobData.priority),
                1
              ),
            ]),
            createBaseVNode("div", _hoisted_21, [
              _hoisted_22,
              createBaseVNode(
                "div",
                _hoisted_23,
                toDisplayString(_ctx.datetime.fromNow($props.jobData.created)),
                1
              ),
            ]),
            createBaseVNode("div", _hoisted_24, [
              _hoisted_25,
              createBaseVNode(
                "div",
                _hoisted_26,
                toDisplayString(_ctx.datetime.fromNow($props.jobData.updated)),
                1
              ),
            ]),
            createBaseVNode("div", _hoisted_27, [
              _hoisted_28,
              createBaseVNode(
                "div",
                _hoisted_29,
                toDisplayString($props.jobData.activity),
                1
              ),
            ]),
          ]),
        ]),
        createBaseVNode("div", _hoisted_30, [
          createVNode(
            _component_task_table,
            {
              ref: "TaskTable",
              jobID: $props.jobData.id,
              onSelectTask: $options.selectTask,
              onUpdateStatus: $options.updateStatusDetails,
            },
            null,
            8,
            ["jobID", "onSelectTask", "onUpdateStatus"]
          ),
        ]),
      ]))
    : (openBlock(), createElementBlock("div", _hoisted_31, _hoisted_33));
}
const JobDetail = /*#__PURE__*/ _export_sfc(_sfc_main$1, [
  ["render", _sfc_render$1],
  ["__scopeId", "data-v-c88b9322"],
]);

const RunningJobsView_vue_vue_type_style_index_0_scoped_a3856d0c_lang = "";

const lo = __vite__cjsImport0_lodash.__esModule
  ? __vite__cjsImport0_lodash.default
  : __vite__cjsImport0_lodash;

const _sfc_main = {
  name: "JobsView",
  props: ["jobID", "taskID"], // provided by Vue Router.
  components: {
    FooterPopup,
    GetTheAddon,
    JobsTable,
    NotificationBar,
    TaskDetails,
    TasksTable,
    UpdateListener,
    JobDetail,
  },
  data: () => ({
    messages: [],

    jobs: useJobs(),
    tasks: useTasks(),
    notifs: useNotifs(),
    taskLog: useTaskLog(),
    showFooterPopup: !!localStorage.getItem("footer-popover-visible"),

    activeTask: null,
    lo: lo,
  }),
  computed: {
    hasJobData() {
      return !objectEmpty(this.jobs.activeJob);
    },
    hasTaskData() {
      return !objectEmpty(this.tasks.activeTaskID);
    },
  },
  mounted() {
    window.jobsView = this;
    window.footerPopup = this.$refs.footerPopup;
    if (!this.$route.params.jobID) {
      this.jobs.activeJob = null;
      this.jobs.activeJobID = null;
      this.tasks.setActiveTaskID([]);
    }
    // Useful for debugging:
    // this.jobs.$subscribe((mutation, state) => {
    //   console.log("Pinia mutation:", mutation)
    //   console.log("Pinia state   :", state)
    // })

    //this._fetchJob(this.jobID);
    //this._fetchTask(this.taskID);

    window.addEventListener("resize", this._recalcTasksTableHeight);
  },
  unmounted() {
    window.removeEventListener("resize", this._recalcTasksTableHeight);
  },
  watch: {
    jobID(newJobID, oldJobID) {
      this._fetchJob(newJobID);
    },
    taskID(newTaskID, oldTaskID) {
      this._fetchTask(newTaskID);
    },
    showFooterPopup(shown) {
      if (shown) localStorage.setItem("footer-popover-visible", "true");
      else localStorage.removeItem("footer-popover-visible");
      this._recalcTasksTableHeight();
    },
  },
  methods: {
    onSelectJob(data) {
      if (data.id == this.jobID) this.jobs.activeJob = data;
      this._routeToJob(data.id);
    },
    updateStatus() {
      this.$refs.jobDetails.updateStatus();
    },
    updateStatusDetails() {
      this.$refs.taskDetails.fetchTask(this.tasks.$state.activeTaskID);
    },
    onTableJobClicked(rowData) {
      // Don't route to the current job, as that'll deactivate the current task.
      if (rowData.id == this.jobID) return;
      this._routeToJob(rowData.id);
    },
    onTableTaskClicked(rowData) {
      this._routeToTask(rowData.id);
    },
    onActiveJobDeleted(deletedJobUUID) {
      this._routeToJobOverview();
    },

    async onSelectedTaskChanged(taskSummary) {
      if (!taskSummary) {
        // There is no active task.
        return;
      }
      this._routeToTask(taskSummary.id);
      this.tasks.setActiveTaskID(taskSummary.id);
      return;
    },

    showTaskLogTail() {
      this.showFooterPopup = true;
      this.$nextTick(() => {
        this.$refs.footerPopup.showTaskLogTail();
      });
    },

    // SocketIO data event handlers:
    onSioJobUpdate(jobUpdate) {
      this.notifs.addJobUpdate(jobUpdate);
      this.jobs.setIsJobless(false);

      if (this.$refs.jobsTable) {
        this.$refs.jobsTable.processJobUpdate(jobUpdate);
      }
      if (this.jobID != jobUpdate.id || jobUpdate.was_deleted) {
        return;
      }

      this._fetchJob(this.jobID);
      if (jobUpdate.refresh_tasks) {
        if (this.$refs.tasksTable) this.$refs.tasksTable.fetchTasks();
        this._fetchTask(this.taskID);
      }
    },

    /**
     * Event handler for SocketIO task updates.
     * @param {API.SocketIOTaskUpdate} taskUpdate
     */
    onSioTaskUpdate(taskUpdate) {
      this.emitter.emit("processTaskUpdate", taskUpdate);

      if (this.taskID == taskUpdate.id) {
        this._fetchTask(this.taskID);
      }
      this.notifs.addTaskUpdate(taskUpdate);
    },

    /**
     * Event handler for SocketIO task log updates.
     * @param {API.SocketIOTaskLogUpdate} taskLogUpdate
     */
    onSioTaskLogUpdate(taskLogUpdate) {
      this.taskLog.addTaskLogUpdate(taskLogUpdate);
    },

    /**
     * Event handler for SocketIO "last-rendered" updates.
     * @param {API.SocketIOLastRenderedUpdate} lastRenderedUpdate
     */
    onSioLastRenderedUpdate(lastRenderedUpdate) {
      this.$refs.jobDetails.refreshLastRenderedImage(lastRenderedUpdate);
    },

    /**
     * Send to the job overview page, i.e. job view without active job.
     */
    _routeToJobOverview() {
      const route = { name: "jobs" };
      this.$router.push(route);
    },

    closeTaskDetail() {
      this._routeToJob(this.jobID);
    },

    /**
     * @param {string} jobID job ID to navigate to, can be empty string for "no active job".
     */
    _routeToJob(jobID) {
      const route = { name: "jobs", params: { jobID: jobID } };
      this.$router.push(route);
    },
    /**
     * @param {string} taskID task ID to navigate to within this job, can be
     * empty string for "no active task".
     */
    _routeToTask(taskID) {
      const route = {
        name: "jobs",
        params: { jobID: this.jobID, taskID: taskID },
      };
      this.$router.push(route);
    },

    /**
     * Fetch job info and set the active job once it's received.
     * @param {string} jobID job ID, can be empty string for "no job".
     */
    _fetchJob(jobID) {
      if (!jobID) {
        this.jobs.deselectAllJobs();
        return;
      }

      const jobsAPI = new JobsApi(getAPIClient());
      return jobsAPI
        .fetchJob(jobID)
        .then((job) => {
          this.jobs.setActiveJob(job);
          // Forward the full job to Tabulator, so that that gets updated too.
          return;
        })
        .catch((err) => {
          if (err.status == 404) {
            // It can happen that a job cannot be found, for example when it was asynchronously deleted.
            this.jobs.deselectAllJobs();
            return;
          }
          console.log(`Unable to fetch job ${jobID}:`, err);
        });
    },

    /**
     * Fetch task info and set the active task once it's received.
     * @param {string} taskID task ID, can be empty string for "no task".
     */
    _fetchTask(taskID) {
      if (!taskID) {
        this.tasks.deselectAllTasks();
        return;
      }

      const jobsAPI = new JobsApi(getAPIClient());
      return jobsAPI.fetchTask(taskID).then((task) => {
        this.tasks.setActiveTask(task);
        // Forward the full task to Tabulator, so that that gets updated too.\
        this.emitter.emit("processTaskUpdate", task);
      });
    },

    onChatMessage(message) {
      console.log("chat message received:", message);
      this.messages.push(`${message.text}`);
    },

    // SocketIO connection event handlers:
    onSIOReconnected() {
      this.$refs.jobsTable.onReconnected();
      if (this.$refs.tasksTable) this.$refs.tasksTable.onReconnected();
    },
    onSIODisconnected(reason) {},

    _recalcTasksTableHeight() {
      if (!this.$refs.tasksTable) return;
      // Any recalculation should be done after the DOM has updated.
      this.$nextTick(this.$refs.tasksTable.recalcTableHeight);
    },
  },
};

const _withScopeId = (n) => (
  pushScopeId("data-v-a3856d0c"), (n = n()), popScopeId(), n
);
const _hoisted_1 = { class: "jobs-view" };
const _hoisted_2 = /*#__PURE__*/ _withScopeId(() =>
  /*#__PURE__*/ createBaseVNode("div", null, null, -1)
);

function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_jobs_table = resolveComponent("jobs-table");
  const _component_task_details = resolveComponent("task-details");
  const _component_job_detail = resolveComponent("job-detail");
  const _component_update_listener = resolveComponent("update-listener");

  return (
    openBlock(),
    createElementBlock(
      Fragment,
      null,
      [
        createBaseVNode("div", _hoisted_1, [
          withDirectives(
            createVNode(
              _component_jobs_table,
              {
                ref: "jobsTable",
                activeJobID: $props.jobID,
                onSelectJob: $options.onSelectJob,
                onUpdateStatus: $options.updateStatus,
              },
              null,
              8,
              ["activeJobID", "onSelectJob", "onUpdateStatus"]
            ),
            [[vShow, !$options.hasTaskData]]
          ),
          withDirectives(
            createVNode(
              _component_task_details,
              {
                ref: "taskDetails",
                taskID: _ctx.tasks.activeTaskID,
                onCloseTaskDetail: $options.closeTaskDetail,
              },
              null,
              8,
              ["taskID", "onCloseTaskDetail"]
            ),
            [[vShow, $options.hasTaskData]]
          ),
          createVNode(
            _component_job_detail,
            {
              ref: "jobDetails",
              jobData: _ctx.jobs.activeJob,
              onSelectTask: $options.onSelectedTaskChanged,
              onUpdateStatusDetails: $options.updateStatusDetails,
            },
            null,
            8,
            ["jobData", "onSelectTask", "onUpdateStatusDetails"]
          ),
        ]),
        createVNode(
          _component_update_listener,
          {
            ref: "updateListener",
            mainSubscription: "allJobs",
            subscribedJobID: $props.jobID,
            subscribedTaskID: $props.taskID,
            onJobUpdate: $options.onSioJobUpdate,
            onTaskUpdate: $options.onSioTaskUpdate,
            onTaskLogUpdate: $options.onSioTaskLogUpdate,
            onLastRenderedUpdate: $options.onSioLastRenderedUpdate,
            onMessage: $options.onChatMessage,
            onSioReconnected: $options.onSIOReconnected,
            onSioDisconnected: $options.onSIODisconnected,
          },
          null,
          8,
          [
            "subscribedJobID",
            "subscribedTaskID",
            "onJobUpdate",
            "onTaskUpdate",
            "onTaskLogUpdate",
            "onLastRenderedUpdate",
            "onMessage",
            "onSioReconnected",
            "onSioDisconnected",
          ]
        ),
        _hoisted_2,
      ],
      64
    )
  );
}
const RunningJobsView = /*#__PURE__*/ _export_sfc(_sfc_main, [
  ["render", _sfc_render],
  ["__scopeId", "data-v-a3856d0c"],
]);

export { RunningJobsView as default };
