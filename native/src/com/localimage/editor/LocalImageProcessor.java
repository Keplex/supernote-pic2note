package com.localimage.editor;

import android.graphics.Bitmap;
import android.content.Context;
import android.graphics.BitmapFactory;
import android.media.ExifInterface;
import android.os.Environment;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.Comparator;
import java.util.UUID;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class LocalImageProcessor extends ReactContextBaseJavaModule {
    private final PreviewPixels previewPixels = new PreviewPixels(), resizedPixels = new PreviewPixels();
    private Info inspected; private String inspectedKey;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    public LocalImageProcessor(ReactApplicationContext context) { super(context); }
    @Override public String getName() { return "LocalImageProcessor"; }

    @ReactMethod public void getLanguage(Promise promise) {
        String fallback = Locale.getDefault().getLanguage().equals("zh") ? "zh" : "en";
        promise.resolve(getReactApplicationContext().getSharedPreferences("localimage_editor_preferences", Context.MODE_PRIVATE)
            .getString("language", fallback));
    }
    @ReactMethod public void setLanguage(String language, Promise promise) {
        if (!language.equals("zh") && !language.equals("en")) {promise.reject("LANGUAGE", "Invalid language"); return;}
        getReactApplicationContext().getSharedPreferences("localimage_editor_preferences", Context.MODE_PRIVATE)
            .edit().putString("language", language).apply();
        promise.resolve(true);
    }

    @ReactMethod public void getToolbarSide(Promise promise) {
        promise.resolve(getReactApplicationContext().getSharedPreferences("localimage_editor_preferences", Context.MODE_PRIVATE)
            .getString("toolbarSide", "right"));
    }
    @ReactMethod public void setToolbarSide(String side, Promise promise) {
        if (!side.equals("left") && !side.equals("right")) {promise.reject("TOOLBAR_SIDE", "Invalid toolbar side"); return;}
        getReactApplicationContext().getSharedPreferences("localimage_editor_preferences", Context.MODE_PRIVATE)
            .edit().putString("toolbarSide", side).apply();
        promise.resolve(true);
    }

    @ReactMethod public void latestImage(Promise promise) {
        try {worker.execute(() -> {
            try {promise.resolve(LatestImage.find(Environment.getExternalStorageDirectory()).getAbsolutePath());}
            catch (Exception error) {promise.reject("IMAGE_SEARCH", error.getMessage(), error);}
        });} catch (RuntimeException error) {promise.reject("IMAGE_CLOSED", "编辑器已关闭，请重新打开插件", error);}
    }

    private interface Job { WritableMap run() throws Exception; }
    private void dispatch(Promise promise, Job job) {
        try {
            worker.execute(() -> {
                try { promise.resolve(job.run()); }
                catch (OutOfMemoryError error) { previewPixels.clear(); resizedPixels.clear(); inspected=null; inspectedKey=null; promise.reject("IMAGE_MEMORY", "图片处理内存不足，请缩小原图后重试"); }
                catch (Exception error) { promise.reject("IMAGE_PROCESS", error.getMessage(), error); }
            });
        } catch (RuntimeException error) { promise.reject("IMAGE_CLOSED", "编辑器已关闭，请重新打开插件", error); }
    }

    private static final class Info {
        int width, height, orientation;
        int displayWidth() { return orientation >= 5 && orientation <= 8 ? height : width; }
        int displayHeight() { return orientation >= 5 && orientation <= 8 ? width : height; }
    }

    private Info info(String path) throws Exception {
        File file = new File(path);
        if (!file.isAbsolute() || !file.isFile() || !file.canRead()) throw new IOException("图片不存在或不可读取");
        String key=path+"|"+file.length()+"|"+file.lastModified();
        if(key.equals(inspectedKey)&&inspected!=null)return inspected;
        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(path, options);
        if (!("image/png".equals(options.outMimeType) || "image/jpeg".equals(options.outMimeType))) {
            throw new IOException("仅支持有效的 PNG 或 JPEG 图片");
        }
        Info result = new Info();
        result.width = options.outWidth; result.height = options.outHeight; result.orientation = 1;
        if (result.width <= 0 || result.height <= 0 || (long) result.width * result.height > 16000000
            || Math.max(result.width, result.height) > 8192) throw new IOException("图片尺寸无效或超过 1600 万像素 / 8192 像素长边");
        try {
            result.orientation = new ExifInterface(path).getAttributeInt(ExifInterface.TAG_ORIENTATION, 1);
        } catch (IOException ignored) { /* PNG without EXIF is valid. */ }
        if (result.orientation < 1 || result.orientation > 8) result.orientation = 1;
        inspected=result;inspectedKey=key;return result;
    }

    @ReactMethod public void inspect(String path, Promise promise) {
        dispatch(promise, () -> {
            Info info = info(path);
            WritableMap result = Arguments.createMap();
            result.putInt("width", info.displayWidth()); result.putInt("height", info.displayHeight());
            return result;
        });
    }

    private File outputDirectory(String pluginRoot, boolean exporting) throws IOException {
        File root;
        if (exporting) {
            root = new File(Environment.getExternalStorageDirectory(), "MyStyle/LocalImage").getCanonicalFile();
            File shared = new File(Environment.getExternalStorageDirectory(), "MyStyle").getCanonicalFile();
            if (!root.getParentFile().equals(shared)) throw new IOException("导出目录无效");
        } else {
            File plugin = new File(pluginRoot).getCanonicalFile();
            if (!plugin.getName().equals("limg26nomad00001") || !plugin.getParentFile().getName().equals("plugins")) {
                throw new IOException("无法确认插件私有目录，请重新安装升级包");
            }
            root = new File(plugin, "editor-cache").getCanonicalFile();
            if (!root.getParentFile().equals(plugin)) throw new IOException("预览目录无效");
        }
        if (!root.isDirectory() && !root.mkdirs()) throw new IOException("无法创建图片输出目录");
        return root;
    }

    /** Delete only older plugin-generated previews. Exported images are never deleted. */
    private void trimPreviews(File dir, String prefix, File keep) {
        File[] files = dir.listFiles((folder, name) -> name.startsWith(prefix) && name.endsWith(".png"));
        if (files == null) return;
        Arrays.sort(files, Comparator.comparingLong(File::lastModified).reversed());
        for (int i = 3; i < files.length; i++) {
            if (!files[i].equals(keep) && files[i].isFile()) files[i].delete();
        }
    }

    /** Preview reuses source pixels, never a previously adjusted image. Export keeps full quality. */
    @ReactMethod public void render(String source, String pluginRoot, ReadableMap params, String mode, Promise promise) {
        dispatch(promise, () -> renderImage(source, pluginRoot, params, mode));
    }

    private WritableMap renderImage(String source, String pluginRoot, ReadableMap params, String mode) throws Exception {
        if (!mode.equals("base") && !mode.equals("export") && !mode.equals("canvas")) throw new IOException("处理模式无效");
        boolean exporting = mode.equals("export");
        Info info = info(source);
        double left = params.getDouble("left"), top = params.getDouble("top");
        double right = params.getDouble("right"), bottom = params.getDouble("bottom");
        int turns = params.hasKey("rotation") ? params.getInt("rotation") : 0;
        if (turns < 0 || turns > 3) throw new IOException("Invalid rotation");
        boolean mirrorX = params.hasKey("mirrorX") && params.getBoolean("mirrorX");
        boolean mirrorY = params.hasKey("mirrorY") && params.getBoolean("mirrorY");
        boolean canvas = mode.equals("canvas");
        int displayW = turns % 2 == 1 ? info.displayHeight() : info.displayWidth();
        int displayH = turns % 2 == 1 ? info.displayWidth() : info.displayHeight();
        int[] requested = ToneMath.cropPixels(displayW, displayH, left, top, right, bottom);
        int limit = exporting ? 2560 : 1000;
        int sample = 1;
        while ((canvas ? Math.max(displayW,displayH) : Math.max(requested[2], requested[3])) / (sample * 2) >= limit) sample *= 2;
        Bitmap decoded = null, output = null;
        File destination = null;
        boolean completed = false;
        try {
            File sourceFile=new File(source);long length=sourceFile.length(),modified=sourceFile.lastModified();
            PreviewPixels.Frame cached=exporting?null:previewPixels.get(source,length,modified,sample);
            int width,height;int[] input;
            if(cached!=null){width=cached.width;height=cached.height;input=cached.pixels;}
            else {
                BitmapFactory.Options options=new BitmapFactory.Options();
                options.inSampleSize=sample;options.inPreferredConfig=Bitmap.Config.ARGB_8888;
                decoded=BitmapFactory.decodeFile(source,options);if(decoded==null)throw new IOException("图片解码失败");
                width=decoded.getWidth();height=decoded.getHeight();input=new int[width*height];
                decoded.getPixels(input,0,width,0,0,width,height);decoded.recycle();decoded=null;
                if(!exporting){for(int i=0;i<input.length;i++){int g=ToneMath.luminanceOnWhite(input[i]);input[i]=0xff000000|(g<<16)|(g<<8)|g;}
                    previewPixels.put(source,length,modified,sample,new PreviewPixels.Frame(input,width,height));}
            }
            boolean swapped = info.orientation >= 5 && info.orientation <= 8;
            int orientedW = swapped ? height : width, orientedH = swapped ? width : height;
            int rotatedW = turns % 2 == 1 ? orientedH : orientedW, rotatedH = turns % 2 == 1 ? orientedW : orientedH;
            int[] crop = ToneMath.cropPixels(rotatedW, rotatedH, left, top, right, bottom);
            int[] region = canvas ? new int[]{0,0,rotatedW,rotatedH} : crop;
            double factor = Math.min(1, limit / (double) Math.max(region[2], region[3]));
            int outWidth = Math.max(1, (int) Math.round(region[2] * factor));
            int outHeight = Math.max(1, (int) Math.round(region[3] * factor));
            String viewKey=source+"|"+info.orientation+"|"+turns+"|"+mirrorX+"|"+mirrorY+"|"+Arrays.toString(region)+"|"+outWidth+"x"+outHeight;
            PreviewPixels.Frame plane=exporting?null:resizedPixels.get(viewKey,length,modified,sample);
            int[] pixels;
            if(plane!=null)pixels=plane.pixels.clone();
            else {
                pixels=ToneMath.resampleTransformed(input,width,height,info.orientation,turns,mirrorX,mirrorY,region,outWidth,outHeight);
                if(!exporting){resizedPixels.put(viewKey,length,modified,sample,new PreviewPixels.Frame(pixels,outWidth,outHeight));pixels=pixels.clone();}
            }
            int black=params.getInt("black"),white=params.getInt("white");
            if(params.getBoolean("autoLevels")) {
                int[] before;
                if(canvas && !Arrays.equals(crop,region)){double scale=Math.min(1,1000.0/Math.max(crop[2],crop[3]));
                    before=ToneMath.histogram(ToneMath.resampleTransformed(input,width,height,info.orientation,turns,mirrorX,mirrorY,crop,
                        Math.max(1,(int)Math.round(crop[2]*scale)),Math.max(1,(int)Math.round(crop[3]*scale))));
                }else before=ToneMath.histogram(pixels);
                int[] levels=ToneMath.automaticLevels(before);black=levels[0];white=levels[1];
            }
            input=null;
            int[] lookup = ToneMath.lookup(params.getDouble("brightness"), params.getDouble("contrast"),
                params.getDouble("shadows"), params.getDouble("highlights"), black, white);
            boolean opaqueWhite = params.hasKey("opaqueWhite") && params.getBoolean("opaqueWhite");
            ToneMath.applyInPlace(pixels, lookup, opaqueWhite, params.hasKey("invert") && params.getBoolean("invert"));
            output = Bitmap.createBitmap(pixels, outWidth, outHeight, Bitmap.Config.ARGB_8888);
            File directory = outputDirectory(pluginRoot, exporting);
            String prefix = exporting ? "adjusted-" : mode + "-";
            destination = new File(directory, prefix + UUID.randomUUID() + ".png");
            try (FileOutputStream stream = new FileOutputStream(destination)) {
                if (!output.compress(Bitmap.CompressFormat.PNG, 100, stream)) throw new IOException("PNG 保存失败");
                stream.flush(); if(exporting)stream.getFD().sync();
            }
            WritableMap result = Arguments.createMap();
            result.putString("path", destination.getAbsolutePath());
            result.putInt("width", outWidth); result.putInt("height", outHeight);
            result.putInt("black", black); result.putInt("white", white);
            if (!exporting) trimPreviews(directory, prefix, destination);
            completed = true;
            return result;
        } finally {
            if (decoded != null && !decoded.isRecycled()) decoded.recycle();
            if (output != null && !output.isRecycled()) output.recycle();
            if (!completed && destination != null && destination.isFile()) destination.delete();
        }
    }

    @Override public void invalidate() { worker.shutdown(); previewPixels.clear(); resizedPixels.clear(); inspected=null; inspectedKey=null; super.invalidate(); }
}
