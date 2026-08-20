import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Activity, LogOut, Settings2 } from "lucide-react";
import { loadManifest, logout, session, type WebUISession, type Manifest } from "./api";
import { LoginPage } from "./pages/LoginPage";
import { SetupPage } from "./pages/SetupPage";
import { SessionPage } from "./pages/SessionPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ThemePage } from "./pages/ThemePage";
import { webuiRevision } from "./generated/webui-registry";

export function App() {
  const [manifest, setManifest] = useState<Manifest>();
  const [webuiSession, setWebUISession] = useState<WebUISession>();
  const [error, setError] = useState<string>();
  useEffect(() => { loadManifest().then(setManifest).catch((reason: Error) => setError(reason.message)); session().then(setWebUISession).catch(() => undefined); }, []);
  if (error) return <State title="WebUI 装配失败" detail={error} />;
  if (!manifest) return <State title="正在加载 WebUI" detail="正在读取安全 manifest。" />;
  if (manifest.revision !== webuiRevision) return <State title="部署版本不匹配" detail="服务端 manifest 与静态页面 registry 的 revision 不一致，页面已拒绝装配。" />;
  const routes = manifest.routes.filter((route) => route.state === "available");
  return <Shell manifest={manifest} webuiSession={webuiSession} onSession={setWebUISession}><Routes><Route path="/login" element={<LoginPage onSession={setWebUISession} />} /><Route path="/setup" element={<SetupPage onSession={setWebUISession} />} /><Route path="/account/session" element={<SessionPage session={webuiSession} />} /><Route path="/dashboard" element={<DashboardPage />} /><Route path="/appearance" element={<ThemePage />} /><Route path="/403" element={<State title="无权访问" detail="当前主体没有所需 operation 权限。" />} /><Route path="/" element={<Navigate to={routes.find((route) => route.default && route.access === "allowed")?.path ?? "/login"} replace />} /><Route path="*" element={<State title="页面不存在" detail="请求的 WebUI route 不在当前 manifest 中。" />} /></Routes></Shell>;
}

function Shell({ manifest, webuiSession, onSession, children }: { manifest: Manifest; webuiSession?: WebUISession; onSession: (value?: WebUISession) => void; children: import("react").ReactNode }) {
  const navigate = useNavigate(); const location = useLocation(); const menu = useMemo(() => manifest.menu.filter((item) => manifest.routes.some((route) => route.id === item.routeId && route.access === "allowed")), [manifest]);
  return <div className="webui-shell"><aside><div className="brand"><Activity size={20} /> Community Go WebUI</div><nav>{menu.map((item) => <Link className={location.pathname === "/dashboard" ? "active" : ""} key={item.id} to={manifest.routes.find((route) => route.id === item.routeId)?.path ?? "/403"}>{item.titleMessageId}</Link>)}</nav><div className="side-bottom"><Link to="/appearance"><Settings2 size={16} /> 外观</Link><Link to="/account/session"><Settings2 size={16} /> 会话</Link>{webuiSession && <button onClick={() => logout(webuiSession.csrfToken).then(() => { onSession(undefined); navigate("/login"); })}><LogOut size={16} /> 注销</button>}</div></aside><main><header><span>{location.pathname}</span><span className="revision">revision {manifest.revision.slice(0, 12)}</span></header>{children}</main></div>;
}
export function State({ title, detail }: { title: string; detail: string }) { return <div className="center-state"><h1>{title}</h1><p>{detail}</p></div>; }
