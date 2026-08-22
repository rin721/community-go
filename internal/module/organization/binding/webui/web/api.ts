import { requestJSON } from "@webui/sdk/http";

export type Department={id:string;code:string;name:string;parentId?:string;active:boolean;archived:boolean;version:number};
export type DepartmentNode=Department&{children:DepartmentNode[]};
export type Position={id:string;code:string;name:string;active:boolean;archived:boolean;version:number};
export type Assignment={accountId:string;departmentId?:string;positionIds:string[];version:number};
export type Account={id:string;username:string;displayName:string};
type ListResult<T>={items:T[];offset:number;limit:number;total:number};
const json=(body:unknown)=>({headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
export const listDepartments=(query?:string)=>requestJSON<ListResult<Department>>(`/api/v1/organization/departments?offset=0&limit=100${query?`&query=${encodeURIComponent(query)}`:""}`).then((value)=>value.items);
export const departmentTree=()=>requestJSON<DepartmentNode[]>("/api/v1/organization/departments/tree");
export const createDepartment=(code:string,name:string,parentId?:string)=>requestJSON<Department>("/api/v1/organization/departments",{method:"POST",...json({code,name,parentId:parentId||undefined})});
export const updateDepartment=(value:Department, changes:Record<string,unknown>)=>requestJSON<Department>(`/api/v1/organization/departments/${value.id}`,{method:"PATCH",...json({version:value.version,...changes})});
export const listPositions=(query?:string)=>requestJSON<ListResult<Position>>(`/api/v1/organization/positions?offset=0&limit=100${query?`&query=${encodeURIComponent(query)}`:""}`).then((value)=>value.items);
export const createPosition=(code:string,name:string)=>requestJSON<Position>("/api/v1/organization/positions",{method:"POST",...json({code,name})});
export const updatePosition=(value:Position,changes:Record<string,unknown>)=>requestJSON<Position>(`/api/v1/organization/positions/${value.id}`,{method:"PATCH",...json({version:value.version,...changes})});
export const listAccounts=()=>requestJSON<ListResult<Account>>("/api/v1/iam/accounts?offset=0&limit=100").then((value)=>value.items);
export const getAssignment=(accountId:string)=>requestJSON<Assignment>(`/api/v1/organization/accounts/${accountId}/assignment`);
export const replaceAssignment=(accountId:string,expectedVersion:number,departmentId:string,positionIds:string[])=>requestJSON<Assignment>(`/api/v1/organization/accounts/${accountId}/assignment`,{method:"PUT",...json({expectedVersion,departmentId:departmentId||undefined,positionIds})});
