import { requestJSON } from "@webui/sdk/http";
export type Menu={id:string;moduleId:string;routeId:string;titleMessageId:string;iconId:string;defaultParentId:string;defaultOrder:number;enabled:boolean;parentId:string;order:number;version:number;overridden:boolean;parentOverridden:boolean;orderOverridden:boolean};
export type MenuList={items:Menu[];catalogRevision:string;navigationRevision:string};
export const listMenus=()=>requestJSON<MenuList>("/api/v1/navigation/menus");
const mutationHeaders=async()=>{const session=await requestJSON<{csrfToken:string}>("/api/v1/iam/session");return {"Content-Type":"application/json",Origin:window.location.origin,"X-CSRF-Token":session.csrfToken};};
export const updateMenu=async(menu:Menu,enabled:boolean,parentOverride?:string,orderOverride?:number)=>requestJSON<{catalogRevision:string;navigationRevision:string}>(`/api/v1/navigation/menus/${menu.id}`,{method:"PUT",headers:await mutationHeaders(),body:JSON.stringify({enabled,parentOverride,orderOverride,version:menu.version})});
