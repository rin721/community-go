import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setup, type WebUISession } from "../api";

const setupErrorMessages: Record<string, string> = {
  cors_origin_denied: "当前 WebUI 地址未被后端允许，请检查 Origin 配置并重启后端。",
  internal_server_error: "首次设置失败，请检查后端日志后重试。",
  invalid_credentials: "Setup Token 不正确，请使用启动后端时设置的同一 Token。",
  invalid_request: "请求内容无效，请检查输入后重试。",
  origin_rejected: "当前 WebUI 地址未通过安全校验，请检查 Origin 配置并重启后端。",
  password_length_invalid: "密码长度必须为 15 至 128 个字符。",
  setup_closed: "首次设置已经关闭，请前往登录页面。",
  username_invalid: "用户名不能为空且不能超过 128 个字符。",
};

export function setupErrorMessage(reason: unknown): string {
  if (!(reason instanceof Error)) {
    return "首次设置失败，请稍后重试。";
  }
  return setupErrorMessages[reason.message] ?? "首次设置失败，请稍后重试。";
}

export function SetupPage({ onSession }: { onSession: (value: WebUISession) => void }) {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  return (
    <form
      className="auth-card"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        setup(token, username, password)
          .then((value) => {
            onSession(value);
            navigate("/dashboard");
          })
          .catch((reason: unknown) => setError(setupErrorMessage(reason)));
      }}
    >
      <h1>首次设置</h1>
      <p>完成后 setup 入口会永久关闭。</p>
      <label>
        Setup Token
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          required
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
      </label>
      <label>
        用户名
        <input
          required
          maxLength={128}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </label>
      <label>
        密码
        <input
          type="password"
          required
          minLength={15}
          maxLength={128}
          aria-describedby="setup-password-requirement"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <p id="setup-password-requirement">密码长度为 15 至 128 个字符。</p>
      {error && <p className="error">{error}</p>}
      <button type="submit">创建 WebUI 用户</button>
    </form>
  );
}
