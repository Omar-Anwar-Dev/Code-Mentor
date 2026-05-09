namespace CodeMentor.Infrastructure.Storage;

public class BlobStorageOptions
{
    public const string SectionName = "BlobStorage";

    /// <summary>
    /// Azure Storage connection string. Dev: Azurite well-known string.
    /// </summary>
    public string ConnectionString { get; set; } =
        "DefaultEndpointsProtocol=http;" +
        "AccountName=devstoreaccount1;" +
        "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;" +
        "BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;";
}
