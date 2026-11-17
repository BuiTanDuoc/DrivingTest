using DrivingTest.Application.Common;
using DrivingTest.Domain;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;

namespace DrivingTest.Application.Features.Admin;

// ======================= DTO =======================
public sealed record AdminUserDto(
    Guid Id, string Email, string DisplayName, string Role, DateTime CreatedAt, int ExamCount);

internal static class AdminUserSupport
{
    public static IQueryable<AdminUserDto> Project(IAppDbContext db, IQueryable<AppUser> users)
        => users.Select(u => new AdminUserDto(
            u.Id, u.Email, u.DisplayName, u.Role, u.CreatedAt,
            db.ExamAttempts.Count(a => a.UserId == u.Id)));

    public static async Task<AdminUserDto> LoadAsync(IAppDbContext db, Guid id, CancellationToken ct)
        => await Project(db, db.Users.AsNoTracking().Where(u => u.Id == id)).FirstOrDefaultAsync(ct)
           ?? throw new NotFoundException("User", id);

    public static async Task<AppUser> FindAsync(IAppDbContext db, Guid id, CancellationToken ct)
        => await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct) ?? throw new NotFoundException("User", id);

    public static async Task EnsureEmailFreeAsync(IAppDbContext db, string normalizedEmail, Guid? excludeId, CancellationToken ct)
    {
        if (await db.Users.AnyAsync(u => u.NormalizedEmail == normalizedEmail && u.Id != excludeId, ct))
            throw new ConflictException("Email is already registered.");
    }

    /// <summary>Hệ thống luôn phải còn ít nhất một Admin.</summary>
    public static async Task EnsureNotLastAdminAsync(IAppDbContext db, AppUser user, CancellationToken ct)
    {
        if (user.Role == Roles.Admin && await db.Users.CountAsync(u => u.Role == Roles.Admin, ct) <= 1)
            throw new BadRequestException("The system must keep at least one admin account.");
    }
}

// ======================= Danh sách =======================
public sealed record AdminListUsersQuery(string? Search, string? Role, int Page = 1, int PageSize = 20)
    : IQuery<PagedResult<AdminUserDto>>;

public sealed class AdminListUsersValidator : AbstractValidator<AdminListUsersQuery>
{
    public AdminListUsersValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, Paging.MaxPageSize);
        RuleFor(x => x.Search).MaximumLength(100);
        RuleFor(x => x.Role!).ValidRole().When(x => !string.IsNullOrEmpty(x.Role));
    }
}

public sealed class AdminListUsersHandler(IAppDbContext db)
    : IQueryHandler<AdminListUsersQuery, PagedResult<AdminUserDto>>
{
    public async ValueTask<PagedResult<AdminUserDto>> Handle(AdminListUsersQuery q, CancellationToken ct)
    {
        var users = db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            var upper = s.ToUpperInvariant();
            users = users.Where(u => u.NormalizedEmail.Contains(upper) || u.DisplayName.Contains(s));
        }
        if (!string.IsNullOrEmpty(q.Role)) users = users.Where(u => u.Role == q.Role);

        var total = await users.CountAsync(ct);
        var items = await AdminUserSupport.Project(db, users
                .OrderByDescending(u => u.CreatedAt)
                .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize))
            .ToListAsync(ct);

        return new PagedResult<AdminUserDto>(items, q.Page, q.PageSize, total);
    }
}

// ======================= Chi tiết =======================
public sealed record AdminGetUserQuery(Guid Id) : IQuery<AdminUserDto>;

public sealed class AdminGetUserHandler(IAppDbContext db) : IQueryHandler<AdminGetUserQuery, AdminUserDto>
{
    public async ValueTask<AdminUserDto> Handle(AdminGetUserQuery q, CancellationToken ct)
        => await AdminUserSupport.LoadAsync(db, q.Id, ct);
}

// ======================= Tạo =======================
public sealed record CreateUserCommand(string Email, string DisplayName, string Role, string Password) : ICommand<AdminUserDto>;

public sealed class CreateUserValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Role).ValidRole();
        RuleFor(x => x.Password).StrongPassword();
    }
}

public sealed class CreateUserHandler(IAppDbContext db, IPasswordService passwords, TimeProvider clock)
    : ICommandHandler<CreateUserCommand, AdminUserDto>
{
    public async ValueTask<AdminUserDto> Handle(CreateUserCommand cmd, CancellationToken ct)
    {
        var email = cmd.Email.Trim();
        var normalized = email.ToUpperInvariant();
        await AdminUserSupport.EnsureEmailFreeAsync(db, normalized, null, ct);

        var user = new AppUser
        {
            Id = Guid.CreateVersion7(),
            Email = email,
            NormalizedEmail = normalized,
            DisplayName = cmd.DisplayName.Trim(),
            Role = cmd.Role,
            CreatedAt = clock.GetUtcNow().UtcDateTime
        };
        user.PasswordHash = passwords.Hash(user, cmd.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return await AdminUserSupport.LoadAsync(db, user.Id, ct);
    }
}

// ======================= Sửa =======================
/// <summary>ActorId: admin đang thao tác (không được tự hạ quyền của chính mình).</summary>
public sealed record UpdateUserCommand(Guid ActorId, Guid Id, string Email, string DisplayName, string Role) : ICommand<AdminUserDto>;

public sealed class UpdateUserValidator : AbstractValidator<UpdateUserCommand>
{
    public UpdateUserValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Role).ValidRole();
    }
}

public sealed class UpdateUserHandler(IAppDbContext db, TimeProvider clock) : ICommandHandler<UpdateUserCommand, AdminUserDto>
{
    public async ValueTask<AdminUserDto> Handle(UpdateUserCommand cmd, CancellationToken ct)
    {
        var user = await AdminUserSupport.FindAsync(db, cmd.Id, ct);

        var roleChanged = user.Role != cmd.Role;
        if (roleChanged && cmd.Role != Roles.Admin)
        {
            if (user.Id == cmd.ActorId) throw new BadRequestException("You cannot remove your own admin role.");
            await AdminUserSupport.EnsureNotLastAdminAsync(db, user, ct);
        }

        var email = cmd.Email.Trim();
        var normalized = email.ToUpperInvariant();
        if (normalized != user.NormalizedEmail) await AdminUserSupport.EnsureEmailFreeAsync(db, normalized, user.Id, ct);

        user.Email = email;
        user.NormalizedEmail = normalized;
        user.DisplayName = cmd.DisplayName.Trim();
        user.Role = cmd.Role;

        // Đổi quyền: thu hồi phiên để lần đăng nhập sau nhận token có quyền mới.
        if (roleChanged) await db.RevokeAllRefreshTokensAsync(user.Id, clock.GetUtcNow().UtcDateTime, ct);

        await db.SaveChangesAsync(ct);
        return await AdminUserSupport.LoadAsync(db, user.Id, ct);
    }
}

// ======================= Xóa =======================
/// <summary>Xóa hẳn tài khoản; lịch sử thi, bookmark, thống kê, refresh token bị xóa theo (cascade).</summary>
public sealed record DeleteUserCommand(Guid ActorId, Guid Id) : ICommand<Unit>;

public sealed class DeleteUserHandler(IAppDbContext db) : ICommandHandler<DeleteUserCommand, Unit>
{
    public async ValueTask<Unit> Handle(DeleteUserCommand cmd, CancellationToken ct)
    {
        if (cmd.Id == cmd.ActorId) throw new BadRequestException("You cannot delete your own account.");

        var user = await AdminUserSupport.FindAsync(db, cmd.Id, ct);
        await AdminUserSupport.EnsureNotLastAdminAsync(db, user, ct);

        db.Users.Remove(user);
        await db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

// ======================= Đặt lại mật khẩu =======================
/// <summary>Admin đặt mật khẩu mới cho user; mọi phiên đăng nhập của user bị thu hồi.</summary>
public sealed record AdminResetPasswordCommand(Guid Id, string NewPassword) : ICommand<Unit>;

public sealed class AdminResetPasswordValidator : AbstractValidator<AdminResetPasswordCommand>
{
    public AdminResetPasswordValidator() => RuleFor(x => x.NewPassword).StrongPassword();
}

public sealed class AdminResetPasswordHandler(IAppDbContext db, IPasswordService passwords, TimeProvider clock)
    : ICommandHandler<AdminResetPasswordCommand, Unit>
{
    public async ValueTask<Unit> Handle(AdminResetPasswordCommand cmd, CancellationToken ct)
    {
        var user = await AdminUserSupport.FindAsync(db, cmd.Id, ct);
        user.PasswordHash = passwords.Hash(user, cmd.NewPassword);
        await db.RevokeAllRefreshTokensAsync(user.Id, clock.GetUtcNow().UtcDateTime, ct);
        await db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}
