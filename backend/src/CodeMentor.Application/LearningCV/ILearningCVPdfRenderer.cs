using CodeMentor.Application.LearningCV.Contracts;

namespace CodeMentor.Application.LearningCV;

/// <summary>
/// S7-T5: renders a Learning CV payload to a PDF byte stream. The contract is
/// kept narrow (DTO in → bytes out) so the implementation can swap between
/// QuestPDF and any future AI-service-driven generator without touching
/// callers (Application layer + controller).
/// </summary>
public interface ILearningCVPdfRenderer
{
    byte[] Render(LearningCVDto cv);
}
