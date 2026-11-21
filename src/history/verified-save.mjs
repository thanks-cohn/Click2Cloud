// Receipt projection shared by History writes and the Chrome badge.
export function independentlyConfirmedScreenshot(output,outputId){
 return output?.state==='confirmed'&&(!output.outputId||output.outputId===outputId)&&
  ['direct-r2-get-sha256','independent-r2-head-sha256'].includes(output.verification);
}

export function hasVerifiedSave(row){
 if(!row?.operationId)return false;
 if(row.kind==='screenshot-to-cloud'){
  const {plan,outputs}=row.screenshot??{};
  return ['confirmed','partial'].includes(row.state)&&plan?.operationId===row.operationId&&
   Array.isArray(plan.outputs)&&plan.outputs.some((intended,index)=>
    !!intended?.outputId&&independentlyConfirmedScreenshot(outputs?.[index],intended.outputId));
 }
 return (!row.kind||row.kind==='save')&&row.state==='verified'&&!!row.proofKind&&!!row.receipt?.key;
}

export function verifiedSaveTime(row){
 // A retry or status refresh never moves an already earned count to a new day.
 return row?.badgeVerifiedAt??(hasVerifiedSave(row)?row.updatedAt??row.at:undefined);
}
