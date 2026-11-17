using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace DrivingTest.Api.Infrastructure;

/// <summary>Khai báo JWT Bearer trong tài liệu OpenAPI để Swagger UI có nút "Authorize".</summary>
internal sealed class BearerSecuritySchemeTransformer(IAuthenticationSchemeProvider schemes) : IOpenApiDocumentTransformer
{
    public async Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
    {
        document.Info ??= new OpenApiInfo();
        document.Info.Title = "DrivingTest API";
        document.Info.Description = "API học và thi thử bằng lái xe hạng B. Đăng nhập qua POST /api/auth/login rồi dán accessToken vào nút Authorize.";

        if ((await schemes.GetAllSchemesAsync()).All(s => s.Name != "Bearer")) return;

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes = new Dictionary<string, IOpenApiSecurityScheme>
        {
            ["Bearer"] = new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                In = ParameterLocation.Header,
                BearerFormat = "JWT"
            }
        };

        // Áp dụng cho toàn bộ tài liệu; endpoint ẩn danh vẫn gọi được khi chưa nhập token.
        document.Security = [new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference("Bearer", document)] = [] }];
    }
}
