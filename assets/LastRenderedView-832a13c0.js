import { L as LastRenderedImage } from "./LastRenderedImage-6d6daeaa.js";
import {
  N as NotificationBar,
  U as UpdateListener,
} from "./UpdateListener-0386af97.js";
import {
  _ as _export_sfc,
  a as openBlock,
  c as createElementBlock,
  e as createBaseVNode,
  f as createVNode,
  F as Fragment,
  E as resolveComponent,
} from "./index-7ba45308.js";

const LastRenderedView_vue_vue_type_style_index_0_scoped_7e5cb44c_lang = "";

const LastRenderedView_vue_vue_type_style_index_1_scoped_7e5cb44c_lang = "";

const _sfc_main = {
  name: "LastRenderedView",
  components: {
    LastRenderedImage,
    NotificationBar,
    UpdateListener,
  },
  data: () => ({}),
  methods: {
    /**
     * Event handler for SocketIO "last-rendered" updates.
     * @param {API.SocketIOLastRenderedUpdate} lastRenderedUpdate
     */
    onSioLastRenderedUpdate(lastRenderedUpdate) {
      this.$refs.lastRenderedImage.refreshLastRenderedImage(lastRenderedUpdate);
    },

    // SocketIO connection event handlers:
    onSIOReconnected() {},
    onSIODisconnected(reason) {},
  },
};
const _hoisted_1 = {
  class: "global-last-rendered",
  style: { flex: "1" },
};

function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_last_rendered_image = resolveComponent(
    "last-rendered-image"
  );
  const _component_update_listener = resolveComponent("update-listener");

  return (
    openBlock(),
    createElementBlock(
      Fragment,
      null,
      [
        createBaseVNode("div", _hoisted_1, [
          createVNode(
            _component_last_rendered_image,
            {
              ref: "lastRenderedImage",
              jobID: false,
              thumbnailSuffix: "last-rendered.jpg",
            },
            null,
            512
          ),
        ]),
        createVNode(
          _component_update_listener,
          {
            ref: "updateListener",
            mainSubscription: "allLastRendered",
            onLastRenderedUpdate: $options.onSioLastRenderedUpdate,
            onSioReconnected: $options.onSIOReconnected,
            onSioDisconnected: $options.onSIODisconnected,
          },
          null,
          8,
          ["onLastRenderedUpdate", "onSioReconnected", "onSioDisconnected"]
        ),
      ],
      64
    )
  );
}
const LastRenderedView = /*#__PURE__*/ _export_sfc(_sfc_main, [
  ["render", _sfc_render],
  ["__scopeId", "data-v-7e5cb44c"],
]);

export { LastRenderedView as default };
