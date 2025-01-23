namespace lib.storage;

public static class StorageExtensions
{
    public static List<string> UploadFolderContents(this IStorageSystem storage, string folderPath)
    {
        var contents = Directory.EnumerateFiles(folderPath,
            searchPattern: string.Empty,
            SearchOption.AllDirectories);

        foreach (var file in contents)
        {
            var key = Path.GetFileName(file);
            storage.Upload(file, key);
        }

        return contents.Select(Path.GetFileName).ToList();
    }

    public static string DownloadIntoTempFolder(this IStorageSystem storage, string rootPath, string fileKey)
    {
        //string localPath = Path.Combine(rootPath, GenerateId());

        //Directory.CreateDirectory(localPath);

        storage.Download(rootPath, fileKey);

        return rootPath;
    }

    public static string DownloadIntoTempFolder(this IStorageSystem storage, string rootPath, string[] files)
    {
        var folder = storage.DownloadIntoTempFolder(rootPath,files[0]);

        for (var i = 1; i < files.Length; i++)
        {
            var file = files[i];
            storage.Download(folder, file);
        }
            
        return folder;
    }
    
    private static string GenerateId()
    {
        return Guid.NewGuid().ToString()[..8];
    }
}