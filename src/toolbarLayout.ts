export function toolbarLayout(height:number,count=9) {
  const available=Math.max(0,height),columns=available>=520?1:available>=260?2:3,rows=Math.ceil(count/columns);
  let circle=available>=600?38:available>=310?36:available>=260?32:30;
  const padding=available>=600?16:available>=520?12:available>=310?14:available>=260?10:6;
  const preferredGap=available>=600?14:available>=520?8:available>=310?12:available>=260?8:4;
  circle=Math.max(12,Math.min(circle,Math.floor((available-3-padding*2)/rows)-13));
  const cellHeight=circle+13,gap=Math.max(0,Math.min(preferredGap,Math.floor((available-3-padding*2-rows*cellHeight)/Math.max(1,rows-1))));
  return {columns,rows,circle,padding,gap,cellHeight,width:columns*48+(columns-1)*8+16,
    height:rows*cellHeight+(rows-1)*gap+padding*2+3};
}
