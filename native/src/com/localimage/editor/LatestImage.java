package com.localimage.editor;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.Locale;
/** FILE:READ grants exactly these roots, never the shared-storage root itself. */
public final class LatestImage {
    public static final String[] ROOTS = {"Document", "EXPORT", "INBOX", "MyStyle", "Note", "SCREENSHOT"};
    interface Created {long time(File file) throws IOException;}
    public static File find(File storage) throws IOException {
        return find(storage, file -> Files.readAttributes(file.toPath(), BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS).creationTime().toMillis());
    }
    // Injectable clock for deterministic tests. No explicit lastModified fallback.
    static File find(File storage, Created created) throws IOException {
        File newest = null; long newestTime = Long.MIN_VALUE; int entries = 0;
        HashSet<String> visited = new HashSet<>();
        for (String name : ROOTS) {
            File root = new File(storage, name).getAbsoluteFile();
            String prefix = root.getPath() + File.separator;
            File generated = new File(storage, "MyStyle/LocalImage").getAbsoluteFile();
            ArrayDeque<File> pending = new ArrayDeque<>(); pending.add(root);
            while (!pending.isEmpty()) {
                File dir = pending.removeFirst();
                if (!visited.add(dir.getPath()) || dir.equals(generated) || Files.isSymbolicLink(dir.toPath())) continue;
                File[] files = dir.listFiles(); if (files == null) continue;
                for (File file : files) {
                    if (++entries > 200000) throw new IOException("图片目录过大，请使用手动选择。");
                    String lower = file.getName().toLowerCase(Locale.ROOT);
                    if (lower.startsWith(".") || lower.equals("android") || lower.equals("plugins") || Files.isSymbolicLink(file.toPath())) continue;
                    if (!file.getAbsolutePath().startsWith(prefix)) continue;
                    if (file.isDirectory()) {pending.add(file); continue;}
                    if (!file.isFile() || !file.canRead() || !lower.matches(".*\\.(png|jpe?g)$")) continue;
                    long timestamp;
                    try {timestamp = created.time(file);} catch (IOException unavailable) {continue;}
                    if (timestamp <= 0) continue;
                    if (newest == null || timestamp > newestTime || (timestamp == newestTime && file.getPath().compareTo(newest.getPath()) < 0)) {
                        newest = file; newestTime = timestamp;
                    }
                }
            }
        }
        if (newest == null) throw new IOException("白名单目录中未找到有创建时间的图片。请将图片放入 INBOX 或 EXPORT，或使用选择图片。");
        return newest;
    }
}
