export function playerHoverPose(clock:number){
 return {x:Math.sin(clock*12)*1.15,y:Math.sin(clock*4)*3.8,angle:Math.sin(clock*3)*.02};
}
