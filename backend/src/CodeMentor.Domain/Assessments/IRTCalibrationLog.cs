namespace CodeMentor.Domain.Assessments;

/// <summary>
/// S17-T6 / F15 (ADR-049 / ADR-055): one row per recalibration *consideration*
/// of a Question.
///
/// The Hangfire <c>RecalibrateIRTJob</c> writes a log row for EVERY question
/// it inspects, regardless of whether it actually re-rated the params:
/// - <see cref="WasRecalibrated"/> = true  → params changed (responseCount &gt;= 1000 + not Admin-locked).
/// - <see cref="WasRecalibrated"/> = false → skipped (under threshold OR Admin-locked).
///
/// Skipped rows are kept on purpose so the admin calibration dashboard can show
/// "we looked, here's why it didn't change" provenance — important for the
/// thesis honesty pass per ADR-055 (most pre-defense items will have
/// `WasRecalibrated=false` because of the &gt;=1000 threshold).
/// </summary>
public class IRTCalibrationLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK to <see cref="Question.Id"/>. Indexed for the per-question history query.</summary>
    public Guid QuestionId { get; set; }

    public DateTime CalibratedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Number of responses considered at this run.</summary>
    public int ResponseCountAtRun { get; set; }

    /// <summary>Discrimination param BEFORE this run (mirror of Questions.IRT_A pre-update).</summary>
    public double IRT_A_Old { get; set; }
    /// <summary>Difficulty param BEFORE this run (mirror of Questions.IRT_B pre-update).</summary>
    public double IRT_B_Old { get; set; }

    /// <summary>Discrimination param AFTER this run. Equal to <see cref="IRT_A_Old"/>
    /// when <see cref="WasRecalibrated"/>=false (skipped path).</summary>
    public double IRT_A_New { get; set; }
    /// <summary>Difficulty param AFTER this run. Equal to <see cref="IRT_B_Old"/>
    /// when <see cref="WasRecalibrated"/>=false (skipped path).</summary>
    public double IRT_B_New { get; set; }

    /// <summary>Joint MLE log-likelihood from the AI-service `/api/irt/recalibrate`.
    /// 0 when the row is a skip (no recalibration was attempted).</summary>
    public double LogLikelihood { get; set; }

    /// <summary>true = params updated; false = job inspected the question but skipped.</summary>
    public bool WasRecalibrated { get; set; }

    /// <summary>Free-text reason when <see cref="WasRecalibrated"/>=false. Examples:
    /// "below_threshold", "admin_locked", "ai_service_unavailable". Optional otherwise.</summary>
    public string? SkipReason { get; set; }

    /// <summary>"Job" (Hangfire scheduled run) or "Admin" (force-recalibrate UI action).
    /// Always "Job" today (admin force action ships in v1.1 per S17 locked answer #3).</summary>
    public string TriggeredBy { get; set; } = "Job";
}
