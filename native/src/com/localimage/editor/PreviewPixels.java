package com.localimage.editor;
/** One read-only preview source, at most 16 MB. Export always decodes independently. */
public final class PreviewPixels {
    public static final class Frame {
        public final int[] pixels; public final int width,height;
        public Frame(int[] pixels,int width,int height){this.pixels=pixels;this.width=width;this.height=height;}
    }
    private String source; private long length,modified; private int sample; private Frame frame;
    public Frame get(String path,long length,long modified,int sample){
        return path.equals(source)&&this.length==length&&this.modified==modified&&this.sample==sample?frame:null;
    }
    public void put(String path,long length,long modified,int sample,Frame value){
        clear();if(value.pixels.length>4000000)return;
        this.source=path;this.length=length;this.modified=modified;this.sample=sample;this.frame=value;
    }
    public void clear(){source=null;frame=null;}
}
