using FluentValidation;
using Mediator;

namespace DrivingTest.Application.Common;

/// <summary>Chạy toàn bộ FluentValidation validator của message trước khi vào handler.</summary>
public sealed class ValidationBehavior<TMessage, TResponse>(IEnumerable<IValidator<TMessage>> validators)
    : IPipelineBehavior<TMessage, TResponse>
    where TMessage : IMessage
{
    public async ValueTask<TResponse> Handle(
        TMessage message, MessageHandlerDelegate<TMessage, TResponse> next, CancellationToken cancellationToken)
    {
        var list = validators.ToList();
        if (list.Count > 0)
        {
            var context = new ValidationContext<TMessage>(message);
            var results = await Task.WhenAll(list.Select(v => v.ValidateAsync(context, cancellationToken)));
            var failures = results.SelectMany(r => r.Errors).Where(f => f is not null).ToList();
            if (failures.Count > 0) throw new ValidationException(failures);
        }

        return await next(message, cancellationToken);
    }
}
