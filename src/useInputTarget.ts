import {useEffect, useRef} from 'react';
import {View, type GestureResponderEvent} from 'react-native';
import {inputRouter} from './inputRouter';
import type {GestureEvents} from './inputRouter';
let next = 0;
const measures = new Set<() => void>();
export function refreshInputBounds() {for(const measure of measures)measure();}
/** Every control gets the same pen fallback, including captions and header actions. */
export function useInputTarget(press: (x: number,y: number) => void, disabled = false, hold?: () => void, priority = 10,drag?:GestureEvents) {
  const idRef=useRef('');if(!idRef.current)idRef.current='input-'+(++next);
  const id=idRef.current, view=useRef<View>(null), latest=useRef({press,disabled,hold,drag});
  latest.current={press,disabled,hold,drag};
  const measure=()=>view.current?.measureInWindow((x,y,width,height)=>{
    inputRouter.bounds(id,{x,y,width:Math.max(0,width),height:Math.max(0,height)});
  });
  useEffect(()=>{
    const remove=inputRouter.register(id,{priority,disabled:()=>latest.current.disabled,
      press:(x,y)=>latest.current.press(x,y),hold:hold?()=>latest.current.hold?.():undefined,
      drag:drag?{start:(x,y)=>latest.current.drag?.start(x,y),move:(x,y)=>latest.current.drag?.move(x,y),
        end:(x,y)=>latest.current.drag?.end(x,y),cancel:()=>latest.current.drag?.cancel()}:undefined});
    measures.add(measure);measure();return()=>{remove();measures.delete(measure);};
  },[id]);
  const stamp=(e?:GestureResponderEvent)=>e?.nativeEvent?.timestamp || 0;
  const continuous=drag?{
    onGestureStart:(e:GestureResponderEvent)=>inputRouter.startDrag(id,e.nativeEvent.locationX,e.nativeEvent.locationY,stamp(e)),
    onGestureMove:(e:GestureResponderEvent)=>inputRouter.moveDrag(id,e.nativeEvent.locationX,e.nativeEvent.locationY),
    onGestureEnd:(e:GestureResponderEvent)=>inputRouter.endDrag(id,e.nativeEvent.locationX,e.nativeEvent.locationY,stamp(e)),
    cancelGesture:()=>inputRouter.cancelDrag(id)}:undefined;
  return {ref:view,onLayout:measure,onPress:(e?:GestureResponderEvent)=>inputRouter.press(id,stamp(e)),
    onLongPress:hold?(e?:GestureResponderEvent)=>inputRouter.hold(id,stamp(e)):undefined,...continuous};
}
