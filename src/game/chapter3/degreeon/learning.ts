/** A first encounter teaches stages 1–4; repeat encounters use expert stages 3–4.
 * Seen IDs span BOTH boss forms and reset only on a whole-fight retry. */
export type Learning={seen:Set<string>;first:boolean;step:number;stages:number[]};
export const freshLearning=():Learning=>({seen:new Set(),first:true,step:0,stages:[0,1,2,3]});
export function startLearning(l:Learning,id:string,force?:'first'|'expert'){
 l.first=force?force==='first':!l.seen.has(id);l.stages=l.first?[0,1,2,3]:[2,3];l.step=0;l.seen.add(id);return l.stages[0];
}
export const hasLearningStep=(l:Learning)=>l.step<l.stages.length-1;
