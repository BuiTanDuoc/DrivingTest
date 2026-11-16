namespace DrivingTest.Application.Common;

public abstract class AppException(int statusCode, string title, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string Title { get; } = title;
}

public sealed class NotFoundException(string message) : AppException(404, "Not found", message)
{
    public NotFoundException(string entity, object key) : this($"{entity} '{key}' was not found.") { }
}

public sealed class ConflictException(string message) : AppException(409, "Conflict", message);

public sealed class BadRequestException(string message) : AppException(400, "Bad request", message);

public sealed class UnauthorizedAppException(string message = "Authentication is required.")
    : AppException(401, "Unauthorized", message);
