using DrivingTest.Application.Common;
using DrivingTest.Application.Features.Questions;
using DrivingTest.Domain;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;

namespace DrivingTest.Application.Features.Bookmarks;

public sealed record GetBookmarksQuery(Guid UserId, int Page, int PageSize, string Lang)
    : IQuery<PagedResult<QuestionDto>>;

public sealed class GetBookmarksValidator : AbstractValidator<GetBookmarksQuery>
{
    public GetBookmarksValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, Paging.MaxPageSize);
    }
}

public sealed class GetBookmarksHandler(IAppDbContext db) : IQueryHandler<GetBookmarksQuery, PagedResult<QuestionDto>>
{
    public async ValueTask<PagedResult<QuestionDto>> Handle(GetBookmarksQuery q, CancellationToken ct)
    {
        var lang = Languages.Normalize(q.Lang);
        var query = db.Bookmarks.AsNoTracking().Where(b => b.UserId == q.UserId && b.Question.IsActive);

        var total = await query.CountAsync(ct);
        var ids = await query.OrderByDescending(b => b.CreatedAt)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(b => b.QuestionId)
            .ToListAsync(ct);

        var items = await QuestionMapper.LoadByIdsAsync(db, ids, lang, q.UserId, ct);
        return new PagedResult<QuestionDto>(items, q.Page, q.PageSize, total);
    }
}

public sealed record AddBookmarkCommand(Guid UserId, int QuestionId) : ICommand<Unit>;

public sealed class AddBookmarkHandler(IAppDbContext db, TimeProvider clock) : ICommandHandler<AddBookmarkCommand, Unit>
{
    public async ValueTask<Unit> Handle(AddBookmarkCommand cmd, CancellationToken ct)
    {
        if (!await db.Questions.AnyAsync(q => q.Id == cmd.QuestionId && q.IsActive, ct))
            throw new NotFoundException("Question", cmd.QuestionId);

        // Idempotent: đã đánh dấu rồi thì không làm gì thêm.
        var exists = await db.Bookmarks.AnyAsync(b => b.UserId == cmd.UserId && b.QuestionId == cmd.QuestionId, ct);
        if (!exists)
        {
            db.Bookmarks.Add(new Bookmark
            {
                UserId = cmd.UserId,
                QuestionId = cmd.QuestionId,
                CreatedAt = clock.GetUtcNow().UtcDateTime
            });
            await db.SaveChangesAsync(ct);
        }

        return Unit.Value;
    }
}

public sealed record RemoveBookmarkCommand(Guid UserId, int QuestionId) : ICommand<Unit>;

public sealed class RemoveBookmarkHandler(IAppDbContext db) : ICommandHandler<RemoveBookmarkCommand, Unit>
{
    public async ValueTask<Unit> Handle(RemoveBookmarkCommand cmd, CancellationToken ct)
    {
        await db.Bookmarks
            .Where(b => b.UserId == cmd.UserId && b.QuestionId == cmd.QuestionId)
            .ExecuteDeleteAsync(ct);
        return Unit.Value;
    }
}
