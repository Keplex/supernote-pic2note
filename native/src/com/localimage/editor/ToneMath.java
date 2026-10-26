package com.localimage.editor;

/** Pure integer-pixel processing, shared by Android and desktop JVM tests. */
public final class ToneMath {
    private ToneMath() {}
    public static int clamp(int value, int low, int high) { return Math.max(low, Math.min(high, value)); }
    public static double unit(double value) { return Math.max(0, Math.min(1, value)); }

    public static int luminanceOnWhite(int argb) {
        if((argb>>>24)==255 && ((argb>>>16)&255)==((argb>>>8)&255) && ((argb>>>8)&255)==(argb&255))return argb&255;
        int a = (argb >>> 24) & 255;
        int r = (((argb >>> 16) & 255) * a + 255 * (255 - a) + 127) / 255;
        int g = (((argb >>> 8) & 255) * a + 255 * (255 - a) + 127) / 255;
        int b = ((argb & 255) * a + 255 * (255 - a) + 127) / 255;
        return (2126 * r + 7152 * g + 722 * b + 5000) / 10000;
    }

    public static int[] histogram(int[] pixels) {
        int[] histogram = new int[256];
        for (int pixel : pixels) histogram[luminanceOnWhite(pixel)]++;
        return histogram;
    }

    public static int[] automaticLevels(int[] histogram) {
        long count = 0;
        for (int value : histogram) count += value;
        long tail = (long) Math.floor(count * 0.005);
        int low = 0, high = 255;
        long sum = 0;
        while (low < 255 && sum + histogram[low] <= tail) sum += histogram[low++];
        sum = 0;
        while (high > 0 && sum + histogram[high] <= tail) sum += histogram[high--];
        // Flat fields and nearly flat scans should not turn into amplified noise.
        return high - low < 24 ? new int[]{0, 255} : new int[]{low, high};
    }

    public static int[] lookup(double brightness, double contrast, double shadows,
                               double highlights, int black, int white) {
        if (!Double.isFinite(brightness) || Math.abs(brightness) > 4
            || !Double.isFinite(contrast) || Math.abs(contrast) > 4
            || !Double.isFinite(shadows) || shadows < 0 || shadows > 4
            || !Double.isFinite(highlights) || highlights < 0 || highlights > 4
            || black < 0 || white > 255 || white - black < 24) {
            throw new IllegalArgumentException("灰阶参数超出范围");
        }
        int[] table = new int[256];
        double gamma = Math.pow(2, -brightness / 4);
        // Contrast is an endpoint-preserving curve, not a hard-clipping affine transform.
        double power = Math.pow(1.18, contrast);
        for (int i = 0; i < 256; i++) {
            double x = unit((i - black) / (double) (white - black));
            x = Math.pow(x, gamma);
            if (x > 0 && x < 1) {
                double a = Math.pow(x, power), b = Math.pow(1 - x, power);
                x = a / (a + b);
            }
            x += shadows * 0.06 * 4 * x * (1 - x) * (1 - x);
            x -= highlights * 0.06 * 4 * x * x * (1 - x);
            table[i] = clamp((int) Math.round(unit(x) * 255), 0, 255);
        }
        return table;
    }

    public static int[] apply(int[] pixels, int[] lookup) {
        return apply(pixels, lookup, false);
    }

    /** Near-white e-ink highlights become #FEFEFE white ink, after resizing/tone/inversion. */
    public static final int WHITE_MASK_MIN = 240;
    public static int[] apply(int[] pixels, int[] lookup, boolean opaqueWhite) {
        return apply(pixels, lookup, opaqueWhite, false);
    }
    public static int[] apply(int[] pixels, int[] lookup, boolean opaqueWhite, boolean invert) {
        return applyPixels(pixels,lookup,opaqueWhite,invert,true);
    }
    public static void applyInPlace(int[] pixels,int[] lookup,boolean opaqueWhite,boolean invert){
        applyPixels(pixels,lookup,opaqueWhite,invert,false);
    }
    private static int[] applyPixels(int[] pixels,int[] lookup,boolean opaqueWhite,boolean invert,boolean count){
        int[] histogram = count?new int[256]:null;
        for (int i = 0; i < pixels.length; i++) {
            int gray = lookup[luminanceOnWhite(pixels[i])];
            if (invert) gray = 255 - gray;
            if (opaqueWhite && gray >= WHITE_MASK_MIN) gray = 254;
            if(count)histogram[gray]++;
            pixels[i] = 0xff000000 | (gray << 16) | (gray << 8) | gray;
        }
        return histogram;
    }

    public static int[] cropPixels(int width, int height, double left, double top, double right, double bottom) {
        if (width <= 0 || height <= 0 || !Double.isFinite(left) || !Double.isFinite(top)
            || !Double.isFinite(right) || !Double.isFinite(bottom)
            || left < 0 || top < 0 || right > 1 || bottom > 1 || right <= left || bottom <= top) {
            throw new IllegalArgumentException("裁剪区域无效");
        }
        int x = clamp((int) Math.floor(left * width), 0, width - 1);
        int y = clamp((int) Math.floor(top * height), 0, height - 1);
        int endX = clamp((int) Math.ceil(right * width), x + 1, width);
        int endY = clamp((int) Math.ceil(bottom * height), y + 1, height);
        return new int[]{x, y, endX - x, endY - y};
    }

    /** Source pixel corresponding to a displayed, EXIF-oriented pixel. */
    public static int sourceIndex(int x, int y, int width, int height, int orientation) {
        int sx = x, sy = y;
        switch (orientation) {
            case 2: sx = width - 1 - x; break;
            case 3: sx = width - 1 - x; sy = height - 1 - y; break;
            case 4: sy = height - 1 - y; break;
            case 5: sx = y; sy = x; break;
            case 6: sx = y; sy = height - 1 - x; break;
            case 7: sx = width - 1 - y; sy = height - 1 - x; break;
            case 8: sx = width - 1 - y; sy = x; break;
            default: break;
        }
        return sy * width + sx;
    }

    public static int[] resample(int[] input, int width, int height, int orientation, int[] crop, int outWidth, int outHeight) {
        return resampleTurned(input, width, height, orientation, 0, crop, outWidth, outHeight);
    }

    public static int rotatedIndex(int x, int y, int width, int height, int orientation, int turns) {
        int w = orientation >= 5 && orientation <= 8 ? height : width;
        int h = orientation >= 5 && orientation <= 8 ? width : height;
        switch (turns) {
            case 1: return sourceIndex(y, h-1-x, width, height, orientation);
            case 2: return sourceIndex(w-1-x, h-1-y, width, height, orientation);
            case 3: return sourceIndex(w-1-y, x, width, height, orientation);
            default: return sourceIndex(x,y,width,height,orientation);
        }
    }
    public static int[] resampleTurned(int[] input, int width, int height, int orientation, int turns, int[] crop, int outWidth, int outHeight) {
        return resampleTransformed(input,width,height,orientation,turns,false,false,crop,outWidth,outHeight);
    }
    private static int transformedIndex(int x, int y, int width, int height, int orientation, int turns, boolean mirrorX, boolean mirrorY) {
        int w = orientation >= 5 && orientation <= 8 ? height : width;
        int h = orientation >= 5 && orientation <= 8 ? width : height;
        if (turns % 2 == 1) {int temp = w; w = h; h = temp;}
        return rotatedIndex(mirrorX ? w-1-x : x, mirrorY ? h-1-y : y, width,height,orientation,turns);
    }
    public static int[] resampleTransformed(int[] input, int width, int height, int orientation, int turns, boolean mirrorX, boolean mirrorY, int[] crop, int outWidth, int outHeight) {
        if (turns < 0 || turns > 3) throw new IllegalArgumentException("Invalid rotation");
        int[] pixels = new int[outWidth * outHeight];
        int displayWidth = orientation >= 5 && orientation <= 8 ? height : width;
        int displayHeight = orientation >= 5 && orientation <= 8 ? width : height;
        if (turns % 2 == 1) {int temp = displayWidth; displayWidth = displayHeight; displayHeight = temp;}
        for (int y = 0; y < outHeight; y++) {
            double sy = crop[1] + (y + 0.5) * crop[3] / outHeight - 0.5;
            sy = Math.max(crop[1], Math.min(crop[1] + crop[3] - 1, sy));
            int y0 = (int) sy, y1 = Math.min(displayHeight - 1, y0 + 1);
            double fy = sy - y0;
            for (int x = 0; x < outWidth; x++) {
                double sx = crop[0] + (x + 0.5) * crop[2] / outWidth - 0.5;
                sx = Math.max(crop[0], Math.min(crop[0] + crop[2] - 1, sx));
                int x0 = (int) sx, x1 = Math.min(displayWidth - 1, x0 + 1);
                double fx = sx - x0;
                int a = luminanceOnWhite(input[transformedIndex(x0, y0, width, height, orientation, turns, mirrorX, mirrorY)]);
                int b = luminanceOnWhite(input[transformedIndex(x1, y0, width, height, orientation, turns, mirrorX, mirrorY)]);
                int c = luminanceOnWhite(input[transformedIndex(x0, y1, width, height, orientation, turns, mirrorX, mirrorY)]);
                int d = luminanceOnWhite(input[transformedIndex(x1, y1, width, height, orientation, turns, mirrorX, mirrorY)]);
                int gray = (int) Math.round((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy);
                pixels[y * outWidth + x] = 0xff000000 | (gray << 16) | (gray << 8) | gray;
            }
        }
        return pixels;
    }
}
