(() => {
  "use strict";

  const STORAGE_KEY = "archflow_private_access_v1";
  const EXPECTED_HASH = "643eadb7f504be6233fc33e718eb42ceb8dec0cce10a99e0e295246af721924f";

  const hasAccess = () => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "granted";
    } catch (_) {
      return false;
    }
  };

  const unlock = () => {
    document.documentElement.classList.remove("archflow-locked");
    document.getElementById("archflow-lock")?.remove();
  };

  const digest = async (value) => {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  };

  const mount = () => {
    if (hasAccess()) {
      unlock();
      return;
    }

    document.documentElement.classList.add("archflow-locked");
    const gate = document.createElement("div");
    gate.id = "archflow-lock";
    gate.innerHTML = `
      <main class="archflow-lock-card" aria-labelledby="archflow-lock-title">
        <p class="archflow-lock-kicker">ARCHFLOW V3 · PRIVATE RESEARCH</p>
        <h1 id="archflow-lock-title">内部研究页面</h1>
        <p class="archflow-lock-copy">施工看板、架构图集与体素 Viewer 暂不公开。输入访问密码后，本标签页内的三个入口将同时解锁。</p>
        <form class="archflow-lock-form">
          <input type="password" name="password" autocomplete="current-password" placeholder="访问密码" aria-label="访问密码" required>
          <button type="submit">进入 →</button>
        </form>
        <p class="archflow-lock-error" role="alert" aria-live="polite"></p>
        <a class="archflow-lock-back" href="/">← 返回 kaiwenliu.work</a>
      </main>`;
    document.body.appendChild(gate);

    const form = gate.querySelector("form");
    const input = gate.querySelector("input");
    const error = gate.querySelector(".archflow-lock-error");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "正在验证…";
      const candidate = await digest(input.value);
      if (candidate !== EXPECTED_HASH) {
        error.textContent = "密码不正确。";
        input.select();
        return;
      }
      try {
        sessionStorage.setItem(STORAGE_KEY, "granted");
      } catch (_) {
        // The page can still unlock for this view when storage is unavailable.
      }
      unlock();
    });
    input.focus();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
