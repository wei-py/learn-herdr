/**
 * Herdr 应用状态；纯领域类型独立于界面。
 * @typedef {import('../domain/types.js').Session} Session
 * @typedef {import('../domain/types.js').Practice} Practice
 * @typedef {import('../domain/types.js').Reading} Reading
 * @typedef {import('../domain/types.js').Question} Question
 * @typedef {import('../domain/types.js').Reference} Reference
 * @typedef {import('../domain/types.js').Progress} Progress
 * @typedef {Practice | Reading} Lesson
 * @typedef {{kind:string,text:string}} Feedback
 * @typedef {{key:string,hash:string}} RouteEntry
 * @typedef {'courses'|'learn'|'reference'|'recall'} Route
 * @typedef {''|'settings'|'help'|'name'|'close'} Dialog
 * @typedef {{progress:Progress,notice:string,currentId:string,session:Session,stepIndex:number,feedback:Feedback,keyHistory:string[],hints:boolean,route:Route,questionId:string,selected:number|null,quizResult:string,revealed:boolean,returnLesson:string|null,referenceQuery:string,referenceKind:string,navigationIndex:number,dialog:Dialog,pendingAction:string,name:string,reconnectCommand:string,prefixDraft:string,configStatus:string,entry:RouteEntry,routeRevision:number,restoreKey:string,rememberedLists:Record<string,string>}} LearningState
 */
export {};
