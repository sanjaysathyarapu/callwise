(function () {
  var script = document.currentScript;
  if (!script) return;
  var slug = script.getAttribute("data-assistant");
  if (!slug) return;
  var origin = new URL(script.src).origin;

  var frame = document.createElement("iframe");
  frame.src = origin + "/embed/" + encodeURIComponent(slug);
  frame.title = "Chat assistant";
  frame.style.cssText =
    "position:fixed;right:20px;bottom:88px;width:380px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 110px);" +
    "border:0;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.25);z-index:2147483646;display:none;background:#fff";

  var button = document.createElement("button");
  button.setAttribute("aria-label", "Open chat");
  button.innerHTML = "&#128172;";
  button.style.cssText =
    "position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;" +
    "font-size:24px;color:#fff;background:#111;box-shadow:0 4px 16px rgba(0,0,0,.3);z-index:2147483647";

  var open = false;
  button.addEventListener("click", function () {
    open = !open;
    frame.style.display = open ? "block" : "none";
    button.innerHTML = open ? "&#10005;" : "&#128172;";
    button.setAttribute("aria-label", open ? "Close chat" : "Open chat");
  });

  document.body.appendChild(frame);
  document.body.appendChild(button);
})();
