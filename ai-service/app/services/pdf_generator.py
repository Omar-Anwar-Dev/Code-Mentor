# PDF Report Generator for Static Analysis Service
# Comprehensive technical report with 10 sections
import logging
from datetime import datetime
from io import BytesIO
from typing import List, Dict, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
    PageBreak, HRFlowable, ListFlowable, ListItem, KeepTogether
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

from app.domain.schemas.responses import AnalysisResponse, AnalysisIssue, IssueSeverity, IssueCategory


logger = logging.getLogger(__name__)


# Color palette
COLORS = {
    'primary': colors.HexColor('#1a365d'),       # Dark blue
    'secondary': colors.HexColor('#2d3748'),     # Dark gray
    'accent': colors.HexColor('#3182ce'),        # Blue
    'success': colors.HexColor('#38a169'),       # Green
    'warning': colors.HexColor('#d69e2e'),       # Yellow/Orange
    'danger': colors.HexColor('#e53e3e'),        # Red
    'info': colors.HexColor('#3182ce'),          # Blue
    'light_gray': colors.HexColor('#f7fafc'),    # Light background
    'border': colors.HexColor('#e2e8f0'),        # Border color
    'text': colors.HexColor('#2d3748'),          # Main text
    'muted': colors.HexColor('#718096'),         # Muted text
}


class PDFReportGenerator:
    """Generate comprehensive PDF reports from static analysis results."""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        self.page_number = 0
        self.toc_entries = []
    
    def _setup_custom_styles(self):
        """Set up custom paragraph styles for professional look."""
        # Cover page title
        self.styles.add(ParagraphStyle(
            name='CoverTitle',
            parent=self.styles['Title'],
            fontSize=28,
            spaceAfter=20,
            textColor=COLORS['primary'],
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Cover subtitle
        self.styles.add(ParagraphStyle(
            name='CoverSubtitle',
            parent=self.styles['Normal'],
            fontSize=16,
            spaceAfter=10,
            textColor=COLORS['secondary'],
            alignment=TA_CENTER
        ))
        
        # Section heading (H1)
        self.styles.add(ParagraphStyle(
            name='SectionHeading',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceBefore=25,
            spaceAfter=15,
            textColor=COLORS['primary'],
            fontName='Helvetica-Bold',
            borderPadding=5,
            leftIndent=0
        ))
        
        # Subsection heading (H2)
        self.styles.add(ParagraphStyle(
            name='SubsectionHeading',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceBefore=18,
            spaceAfter=10,
            textColor=COLORS['secondary'],
            fontName='Helvetica-Bold'
        ))
        
        # H3 heading
        self.styles.add(ParagraphStyle(
            name='H3Heading',
            parent=self.styles['Heading3'],
            fontSize=12,
            spaceBefore=12,
            spaceAfter=8,
            textColor=COLORS['accent'],
            fontName='Helvetica-Bold'
        ))
        
        # Body text
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=8,
            textColor=COLORS['text'],
            alignment=TA_JUSTIFY,
            leading=14
        ))
        
        # Small text
        self.styles.add(ParagraphStyle(
            name='CustomSmall',
            parent=self.styles['Normal'],
            fontSize=9,
            spaceAfter=4,
            textColor=COLORS['muted']
        ))
        
        # Issue card title
        self.styles.add(ParagraphStyle(
            name='IssueTitle',
            parent=self.styles['Normal'],
            fontSize=11,
            fontName='Helvetica-Bold',
            textColor=COLORS['text'],
            spaceAfter=4
        ))
        
        # Footer style
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=COLORS['muted'],
            alignment=TA_CENTER
        ))
        
        # Score display
        self.styles.add(ParagraphStyle(
            name='ScoreDisplay',
            parent=self.styles['Normal'],
            fontSize=48,
            fontName='Helvetica-Bold',
            alignment=TA_CENTER,
            spaceAfter=10
        ))
        
        # Code snippet style (monospace)
        self.styles.add(ParagraphStyle(
            name='CodeSnippet',
            parent=self.styles['Normal'],
            fontSize=8,
            fontName='Courier',
            textColor=COLORS['text'],
            backColor=COLORS['light_gray'],
            leftIndent=5,
            rightIndent=5,
            spaceAfter=6,
            leading=12,
            wordWrap='CJK'  # Better word wrapping
        ))
        
        # Wrapped text style for long content
        self.styles.add(ParagraphStyle(
            name='WrappedText',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=COLORS['text'],
            wordWrap='CJK',
            leading=12
        ))
    
    def generate(self, result: AnalysisResponse, project_name: str, 
                 languages_detected: List[str] = None, files_analyzed: int = 0) -> BytesIO:
        """
        Generate a comprehensive PDF report from analysis results.
        
        Args:
            result: The analysis response
            project_name: Name of the analyzed project
            languages_detected: List of detected programming languages
            files_analyzed: Number of files analyzed
            
        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2.5*cm
        )
        
        story = []
        
        # Build all sections
        self._add_cover_page(story, project_name, result)
        story.append(PageBreak())
        
        self._add_table_of_contents(story)
        story.append(PageBreak())
        
        self._add_analysis_overview(story, result, project_name, languages_detected, files_analyzed)
        self._add_quality_score_explanation(story, result)
        self._add_issues_summary(story, result)
        self._add_severity_legend(story)
        
        story.append(PageBreak())
        self._add_detailed_issues_report(story, result)
        
        story.append(PageBreak())
        self._add_best_practices(story, result)
        self._add_conclusion(story, result)
        
        # Build with custom page template
        doc.build(story, onFirstPage=self._add_page_footer, onLaterPages=self._add_page_footer)
        buffer.seek(0)
        
        logger.info(f"Generated comprehensive PDF report for {project_name}")
        return buffer
    
    def _add_page_footer(self, canvas, doc):
        """Add footer to each page."""
        canvas.saveState()
        
        # Footer line
        canvas.setStrokeColor(COLORS['border'])
        canvas.setLineWidth(0.5)
        canvas.line(2*cm, 2*cm, A4[0] - 2*cm, 2*cm)
        
        # Footer text
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(COLORS['muted'])
        
        # Left: branding
        canvas.drawString(2*cm, 1.5*cm, "Generated by Code Mentor – Static Analysis Service")
        
        # Right: page number
        page_num = canvas.getPageNumber()
        canvas.drawRightString(A4[0] - 2*cm, 1.5*cm, f"Page {page_num}")
        
        canvas.restoreState()
    
    # =========================================================================
    # SECTION 1: COVER PAGE
    # =========================================================================
    def _add_cover_page(self, story: list, project_name: str, result: AnalysisResponse):
        """Add professional cover page."""
        story.append(Spacer(1, 2*inch))
        
        # Main title
        story.append(Paragraph(
            "Static Code Analysis",
            self.styles['CoverTitle']
        ))
        story.append(Paragraph(
            "Detailed Technical Report",
            self.styles['CoverSubtitle']
        ))
        
        story.append(Spacer(1, 0.5*inch))
        
        # Horizontal rule
        story.append(HRFlowable(
            width="60%",
            thickness=2,
            color=COLORS['accent'],
            spaceBefore=10,
            spaceAfter=30,
            hAlign='CENTER'
        ))
        
        # Project info table
        cover_data = [
            ['Project Name', project_name],
            ['Analysis Type', 'Static Analysis'],
            ['Generated', datetime.now().strftime('%B %d, %Y at %H:%M')],
        ]
        
        cover_table = Table(cover_data, colWidths=[2.5*inch, 3*inch])
        cover_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('TEXTCOLOR', (0, 0), (-1, -1), COLORS['text']),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
        ]))
        story.append(cover_table)
        
        story.append(Spacer(1, 0.8*inch))
        
        # Score display with color
        score = result.overallScore
        score_color = self._get_score_color(score)
        
        story.append(Paragraph(
            "Overall Quality Score",
            ParagraphStyle(
                name='ScoreLabel',
                parent=self.styles['Normal'],
                fontSize=14,
                alignment=TA_CENTER,
                textColor=COLORS['muted']
            )
        ))
        
        story.append(Paragraph(
            f"<font color='{score_color.hexval()}'>{score}</font><font size='24'>/100</font>",
            self.styles['ScoreDisplay']
        ))
        
        # Score interpretation badge
        rating, rating_color = self._get_score_rating(score)
        story.append(Paragraph(
            f"<font color='{rating_color.hexval()}'><b>{rating}</b></font>",
            ParagraphStyle(
                name='RatingBadge',
                parent=self.styles['Normal'],
                fontSize=16,
                alignment=TA_CENTER,
                spaceAfter=30
            )
        ))
    
    # =========================================================================
    # SECTION 2: TABLE OF CONTENTS
    # =========================================================================
    def _add_table_of_contents(self, story: list):
        """Add table of contents."""
        story.append(Paragraph("Table of Contents", self.styles['SectionHeading']))
        story.append(Spacer(1, 20))
        
        toc_items = [
            ("1. Analysis Overview", 3),
            ("2. Quality Score Explanation", 3),
            ("3. Issues Summary", 3),
            ("4. Severity Legend", 3),
            ("5. Detailed Issues Report", 4),
            ("    5.1 Errors", 4),
            ("    5.2 Warnings", 4),
            ("    5.3 Informational Issues", 4),
            ("6. Best Practices & Recommendations", 5),
            ("7. Conclusion", 5),
        ]
        
        toc_data = []
        for item, page in toc_items:
            toc_data.append([item, f"....... {page}"])
        
        toc_table = Table(toc_data, colWidths=[4.5*inch, 1.5*inch])
        toc_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TEXTCOLOR', (0, 0), (-1, -1), COLORS['text']),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(toc_table)
    
    # =========================================================================
    # SECTION 3: ANALYSIS OVERVIEW
    # =========================================================================
    def _add_analysis_overview(self, story: list, result: AnalysisResponse, 
                                project_name: str, languages: List[str], files_count: int):
        """Add analysis overview section."""
        story.append(Paragraph("1. Analysis Overview", self.styles['SectionHeading']))
        
        story.append(Paragraph(
            "This report presents the findings from a comprehensive static code analysis "
            "performed on the submitted codebase. The analysis evaluates code quality, "
            "identifies potential security vulnerabilities, performance issues, and "
            "adherence to coding best practices.",
            self.styles['CustomBody']
        ))
        story.append(Spacer(1, 15))
        
        # Overview table
        languages_str = ', '.join(languages) if languages else 'Auto-detected'
        tools_str = ', '.join(result.toolsUsed) if result.toolsUsed else 'Multiple'
        
        overview_data = [
            ['Project Name', project_name],
            ['Languages Detected', languages_str],
            ['Static Analysis Tools', tools_str],
            ['Files Analyzed', str(files_count) if files_count else 'Multiple'],
            ['Total Execution Time', f'{result.executionTimeMs} ms'],
        ]
        
        overview_table = Table(overview_data, colWidths=[2.5*inch, 3.5*inch])
        overview_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), COLORS['light_gray']),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), COLORS['text']),
            ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(overview_table)
        story.append(Spacer(1, 20))
    
    # =========================================================================
    # SECTION 4: QUALITY SCORE EXPLANATION
    # =========================================================================
    def _add_quality_score_explanation(self, story: list, result: AnalysisResponse):
        """Add quality score explanation section."""
        story.append(Paragraph("2. Quality Score Explanation", self.styles['SectionHeading']))
        
        story.append(Paragraph(
            "The overall quality score is calculated based on the number and severity of "
            "issues found during analysis. The scoring algorithm applies weighted penalties "
            "for each issue type:",
            self.styles['CustomBody']
        ))
        story.append(Spacer(1, 10))
        
        # Severity weights table
        weights_data = [
            ['Severity Level', 'Weight Penalty', 'Description'],
            ['Error', '-5 points', 'Critical issues that must be fixed'],
            ['Warning', '-2 points', 'Important issues that should be addressed'],
            ['Info', '-1 point', 'Minor suggestions for improvement'],
        ]
        
        weights_table = Table(weights_data, colWidths=[1.5*inch, 1.5*inch, 3*inch])
        weights_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLORS['secondary']),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            # Color severity column
            ('TEXTCOLOR', (0, 1), (0, 1), COLORS['danger']),
            ('TEXTCOLOR', (0, 2), (0, 2), COLORS['warning']),
            ('TEXTCOLOR', (0, 3), (0, 3), COLORS['info']),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ]))
        story.append(weights_table)
        story.append(Spacer(1, 15))
        
        # Score interpretation guide
        story.append(Paragraph("Score Interpretation Guide", self.styles['SubsectionHeading']))
        
        interpretation_data = [
            ['Score Range', 'Rating', 'Interpretation'],
            ['90 - 100', 'Excellent', 'Code follows best practices with minimal issues'],
            ['75 - 89', 'Good', 'Code is well-written with some minor improvements needed'],
            ['50 - 74', 'Fair', 'Several issues require attention for better quality'],
            ['0 - 49', 'Poor', 'Significant improvements are required'],
        ]
        
        interp_table = Table(interpretation_data, colWidths=[1.2*inch, 1.2*inch, 3.6*inch])
        interp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLORS['secondary']),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            # Color rating column
            ('TEXTCOLOR', (1, 1), (1, 1), COLORS['success']),
            ('TEXTCOLOR', (1, 2), (1, 2), colors.HexColor('#68d391')),
            ('TEXTCOLOR', (1, 3), (1, 3), COLORS['warning']),
            ('TEXTCOLOR', (1, 4), (1, 4), COLORS['danger']),
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
        ]))
        story.append(interp_table)
        story.append(Spacer(1, 20))
    
    # =========================================================================
    # SECTION 5: ISSUES SUMMARY
    # =========================================================================
    def _add_issues_summary(self, story: list, result: AnalysisResponse):
        """Add issues summary section."""
        story.append(Paragraph("3. Issues Summary", self.styles['SectionHeading']))
        
        # Count by category
        category_counts = self._count_by_category(result.issues)
        
        # Summary statistics table
        story.append(Paragraph("Overview Statistics", self.styles['SubsectionHeading']))
        
        summary_data = [
            ['Metric', 'Count'],
            ['Total Issues', str(result.summary.totalIssues)],
            ['Errors', str(result.summary.errors)],
            ['Warnings', str(result.summary.warnings)],
            ['Informational', str(result.summary.info)],
        ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLORS['secondary']),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            # Highlight counts
            ('TEXTCOLOR', (1, 2), (1, 2), COLORS['danger']),
            ('TEXTCOLOR', (1, 3), (1, 3), COLORS['warning']),
            ('TEXTCOLOR', (1, 4), (1, 4), COLORS['info']),
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 15))
        
        # Breakdown by category
        story.append(Paragraph("Breakdown by Category", self.styles['SubsectionHeading']))
        
        cat_data = [['Category', 'Count', 'Description']]
        cat_descriptions = {
            'security': 'Potential security vulnerabilities',
            'performance': 'Performance optimization opportunities',
            'code_style': 'Coding style and formatting issues',
            'best_practices': 'Violations of best practices',
        }
        
        for cat, count in category_counts.items():
            cat_data.append([
                cat.replace('_', ' ').title(),
                str(count),
                cat_descriptions.get(cat, 'General issues')
            ])
        
        if len(cat_data) > 1:
            cat_table = Table(cat_data, colWidths=[1.8*inch, 1*inch, 3.2*inch])
            cat_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), COLORS['secondary']),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ]))
            story.append(cat_table)
        else:
            story.append(Paragraph("No issues found!", self.styles['CustomBody']))
        
        story.append(Spacer(1, 20))
    
    # =========================================================================
    # SECTION 6: SEVERITY LEGEND
    # =========================================================================
    def _add_severity_legend(self, story: list):
        """Add severity legend section."""
        story.append(Paragraph("4. Severity Legend", self.styles['SectionHeading']))
        
        story.append(Paragraph(
            "Each issue is assigned a severity level based on its potential impact on "
            "code quality, security, and maintainability:",
            self.styles['CustomBody']
        ))
        story.append(Spacer(1, 10))
        
        legend_data = [
            ['', 'Severity', 'Description'],
            ['●', 'ERROR', 'Critical issues requiring immediate attention. These may cause bugs, security vulnerabilities, or runtime errors.'],
            ['●', 'WARNING', 'Important issues that should be addressed. These may lead to potential problems or reduce code quality.'],
            ['●', 'INFO', 'Suggestions for improvement. These are minor issues that can enhance code readability and maintainability.'],
        ]
        
        legend_table = Table(legend_data, colWidths=[0.4*inch, 1*inch, 4.6*inch])
        legend_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLORS['secondary']),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            # Color indicators
            ('TEXTCOLOR', (0, 1), (0, 1), COLORS['danger']),
            ('TEXTCOLOR', (0, 2), (0, 2), COLORS['warning']),
            ('TEXTCOLOR', (0, 3), (0, 3), COLORS['info']),
            ('FONTSIZE', (0, 1), (0, -1), 14),
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (1, 1), (1, 1), COLORS['danger']),
            ('TEXTCOLOR', (1, 2), (1, 2), COLORS['warning']),
            ('TEXTCOLOR', (1, 3), (1, 3), COLORS['info']),
        ]))
        story.append(legend_table)
        story.append(Spacer(1, 20))
    
    # =========================================================================
    # SECTION 7: DETAILED ISSUES REPORT
    # =========================================================================
    def _add_detailed_issues_report(self, story: list, result: AnalysisResponse):
        """Add detailed issues report grouped by severity."""
        story.append(Paragraph("5. Detailed Issues Report", self.styles['SectionHeading']))
        
        if not result.issues:
            story.append(Paragraph(
                "✓ Congratulations! No issues were found during the analysis. "
                "Your code passed all checks successfully.",
                self.styles['CustomBody']
            ))
            return
        
        story.append(Paragraph(
            f"A total of {len(result.issues)} issues were identified during the analysis. "
            "Issues are grouped by severity level for easier prioritization.",
            self.styles['CustomBody']
        ))
        story.append(Spacer(1, 15))
        
        # Group issues by severity
        errors = [i for i in result.issues if i.severity == IssueSeverity.ERROR]
        warnings = [i for i in result.issues if i.severity == IssueSeverity.WARNING]
        infos = [i for i in result.issues if i.severity == IssueSeverity.INFO]
        
        issue_id = 1
        
        # 5.1 Errors
        story.append(Paragraph(
            f"5.1 Errors ({len(errors)} issues)",
            self.styles['SubsectionHeading']
        ))
        if errors:
            for issue in errors:
                self._add_issue_card(story, issue, issue_id, COLORS['danger'])
                issue_id += 1
        else:
            story.append(Paragraph("No errors found.", self.styles['CustomBody']))
        
        story.append(Spacer(1, 15))
        
        # 5.2 Warnings
        story.append(Paragraph(
            f"5.2 Warnings ({len(warnings)} issues)",
            self.styles['SubsectionHeading']
        ))
        if warnings:
            for issue in warnings:
                self._add_issue_card(story, issue, issue_id, COLORS['warning'])
                issue_id += 1
        else:
            story.append(Paragraph("No warnings found.", self.styles['CustomBody']))
        
        story.append(Spacer(1, 15))
        
        # 5.3 Informational
        story.append(Paragraph(
            f"5.3 Informational Issues ({len(infos)} issues)",
            self.styles['SubsectionHeading']
        ))
        if infos:
            for issue in infos:
                self._add_issue_card(story, issue, issue_id, COLORS['info'])
                issue_id += 1
        else:
            story.append(Paragraph("No informational issues found.", self.styles['CustomBody']))
    
    def _add_issue_card(self, story: list, issue: AnalysisIssue, issue_id: int, color: colors.Color):
        """Add a single issue card with detailed information."""
        # Build location string with line range if available
        if issue.endLine and issue.endLine != issue.line:
            location = f"Lines {issue.line}-{issue.endLine}"
        else:
            location = f"Line {issue.line}"
        if issue.column:
            location += f", Column {issue.column}"
            if issue.endColumn:
                location += f"-{issue.endColumn}"
        
        # Get tool name from rule if possible
        tool_name = self._get_tool_from_rule(issue.rule)
        
        # Escape special characters for XML compatibility in Paragraph
        def escape_xml(text: str) -> str:
            if not text:
                return ""
            return (text.replace('&', '&amp;')
                       .replace('<', '&lt;')
                       .replace('>', '&gt;')
                       .replace('"', '&quot;'))
        
        # Build issue card data with proper text wrapping for all long fields
        card_data = [
            [f"Issue #{issue_id}", issue.severity.value.upper()],
            ['Category', issue.category.value.replace('_', ' ').title()],
            ['Tool', tool_name],
            ['Rule ID', Paragraph(escape_xml(issue.rule), self.styles['WrappedText'])],
            ['File', Paragraph(escape_xml(issue.file), self.styles['WrappedText'])],
            ['Location', location],
            ['Description', Paragraph(escape_xml(issue.message), self.styles['WrappedText'])],
        ]
        
        # Add code snippet if available
        if issue.codeSnippet:
            # Format code snippet with line indicator
            code_display = escape_xml(issue.codeSnippet.strip())
            # Add arrow to indicate problematic line/column
            if issue.column:
                indicator = " " * (issue.column - 1) + "^--- Issue here"
                code_display = f"{code_display}\n{indicator}"
            card_data.append(['Code', Paragraph(f"<font face='Courier' size='8'>{code_display}</font>", self.styles['WrappedText'])])
        
        # Add impact and recommendation
        card_data.append(['Impact', Paragraph(escape_xml(self._get_impact_description(issue.category)), self.styles['WrappedText'])])
        
        recommendation = issue.suggestedFix or self._get_default_recommendation(issue)
        card_data.append(['Recommendation', Paragraph(escape_xml(recommendation), self.styles['WrappedText'])])
        
        card_table = Table(card_data, colWidths=[1.5*inch, 4.5*inch])
        card_table.setStyle(TableStyle([
            # Header row styling
            ('BACKGROUND', (0, 0), (-1, 0), color),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            
            # Body styling
            ('BACKGROUND', (0, 1), (0, -1), COLORS['light_gray']),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            
            # Border
            ('BOX', (0, 0), (-1, -1), 1, color),
            ('LINEBELOW', (0, 0), (-1, 0), 1, color),
            ('GRID', (0, 1), (-1, -1), 0.5, COLORS['border']),
        ]))
        
        story.append(KeepTogether([card_table, Spacer(1, 15)]))
    
    # =========================================================================
    # SECTION 8: BEST PRACTICES & RECOMMENDATIONS
    # =========================================================================
    def _add_best_practices(self, story: list, result: AnalysisResponse):
        """Add best practices and recommendations section."""
        story.append(Paragraph("6. Best Practices & Recommendations", self.styles['SectionHeading']))
        
        # Analyze patterns
        patterns = self._analyze_patterns(result.issues)
        
        story.append(Paragraph(
            "Based on the analysis findings, here are recommendations to improve code quality:",
            self.styles['CustomBody']
        ))
        story.append(Spacer(1, 10))
        
        # General recommendations
        recommendations = [
            "Regularly run static analysis as part of your CI/CD pipeline",
            "Address all critical (ERROR) issues before merging code",
            "Review and understand each warning to determine its relevance",
            "Use consistent coding standards across the project",
            "Keep dependencies up to date to avoid security vulnerabilities",
        ]
        
        # Add pattern-specific recommendations
        if patterns.get('security', 0) > 0:
            recommendations.insert(0, "Prioritize fixing security issues to prevent vulnerabilities")
        if patterns.get('performance', 0) > 0:
            recommendations.insert(1, "Consider performance optimizations for better efficiency")
        
        for i, rec in enumerate(recommendations, 1):
            story.append(Paragraph(
                f"<b>{i}.</b> {rec}",
                self.styles['CustomBody']
            ))
        
        story.append(Spacer(1, 15))
        
        # Common patterns observed
        if patterns:
            story.append(Paragraph("Common Patterns Observed", self.styles['SubsectionHeading']))
            
            pattern_items = []
            for category, count in patterns.items():
                if count > 0:
                    pattern_items.append(f"{category.replace('_', ' ').title()}: {count} occurrences")
            
            if pattern_items:
                for item in pattern_items:
                    story.append(Paragraph(f"• {item}", self.styles['CustomBody']))
        
        story.append(Spacer(1, 20))
    
    # =========================================================================
    # SECTION 9: CONCLUSION
    # =========================================================================
    def _add_conclusion(self, story: list, result: AnalysisResponse):
        """Add conclusion section."""
        story.append(Paragraph("7. Conclusion", self.styles['SectionHeading']))
        
        score = result.overallScore
        rating, _ = self._get_score_rating(score)
        
        # Overall assessment
        story.append(Paragraph("Overall Assessment", self.styles['SubsectionHeading']))
        
        if score >= 90:
            assessment = (
                "The codebase demonstrates excellent quality with minimal issues. "
                "The code follows best practices and is well-maintained. "
                "Continue the current development practices to maintain this standard."
            )
        elif score >= 75:
            assessment = (
                "The codebase is in good condition with some areas for improvement. "
                "Most issues identified are minor and can be addressed during regular maintenance. "
                "Consider implementing suggested fixes to further improve quality."
            )
        elif score >= 50:
            assessment = (
                "The codebase has several areas requiring attention. "
                "It is recommended to prioritize fixing errors and critical warnings. "
                "A focused effort on code quality will significantly improve maintainability."
            )
        else:
            assessment = (
                "The codebase requires significant improvements to meet quality standards. "
                "Immediate attention is needed for critical issues, especially security vulnerabilities. "
                "Consider a dedicated code quality sprint to address the identified problems."
            )
        
        story.append(Paragraph(assessment, self.styles['CustomBody']))
        story.append(Spacer(1, 15))
        
        # Key risk areas
        if result.summary.errors > 0 or any(i.category == IssueCategory.SECURITY for i in result.issues):
            story.append(Paragraph("Key Risk Areas", self.styles['SubsectionHeading']))
            
            risks = []
            if result.summary.errors > 0:
                risks.append(f"• {result.summary.errors} critical error(s) requiring immediate attention")
            
            security_issues = sum(1 for i in result.issues if i.category == IssueCategory.SECURITY)
            if security_issues > 0:
                risks.append(f"• {security_issues} security-related issue(s) that may expose vulnerabilities")
            
            for risk in risks:
                story.append(Paragraph(risk, self.styles['CustomBody']))
            
            story.append(Spacer(1, 15))
        
        # Next steps
        story.append(Paragraph("Suggested Next Steps", self.styles['SubsectionHeading']))
        
        next_steps = [
            "1. Review and fix all ERROR-level issues immediately",
            "2. Address WARNING-level issues in order of importance",
            "3. Consider INFO-level suggestions for code improvement",
            "4. Re-run analysis after fixes to verify improvements",
            "5. Integrate static analysis into your development workflow",
        ]
        
        for step in next_steps:
            story.append(Paragraph(step, self.styles['CustomBody']))
        
        story.append(Spacer(1, 30))
        
        # Final note
        story.append(HRFlowable(
            width="100%",
            thickness=1,
            color=COLORS['border'],
            spaceBefore=10,
            spaceAfter=15
        ))
        
        story.append(Paragraph(
            "<i>This report was generated by Code Mentor's Static Analysis Service. "
            "For questions or feedback, please contact the development team.</i>",
            ParagraphStyle(
                name='FinalNote',
                parent=self.styles['Normal'],
                fontSize=9,
                textColor=COLORS['muted'],
                alignment=TA_CENTER
            )
        ))
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    def _get_score_color(self, score: int) -> colors.Color:
        """Get color based on score."""
        if score >= 90:
            return COLORS['success']
        elif score >= 75:
            return colors.HexColor('#68d391')  # Light green
        elif score >= 50:
            return COLORS['warning']
        else:
            return COLORS['danger']
    
    def _get_score_rating(self, score: int) -> tuple:
        """Get rating text and color based on score."""
        if score >= 90:
            return ("Excellent", COLORS['success'])
        elif score >= 75:
            return ("Good", colors.HexColor('#68d391'))
        elif score >= 50:
            return ("Fair", COLORS['warning'])
        else:
            return ("Needs Improvement", COLORS['danger'])
    
    def _get_severity_color(self, severity: IssueSeverity) -> colors.Color:
        """Get color based on severity."""
        color_map = {
            IssueSeverity.ERROR: COLORS['danger'],
            IssueSeverity.WARNING: COLORS['warning'],
            IssueSeverity.INFO: COLORS['info'],
        }
        return color_map.get(severity, colors.black)
    
    def _count_by_category(self, issues: List[AnalysisIssue]) -> Dict[str, int]:
        """Count issues by category."""
        counts = {}
        for issue in issues:
            cat = issue.category.value
            counts[cat] = counts.get(cat, 0) + 1
        return counts
    
    def _analyze_patterns(self, issues: List[AnalysisIssue]) -> Dict[str, int]:
        """Analyze issue patterns."""
        patterns = {}
        for issue in issues:
            cat = issue.category.value
            patterns[cat] = patterns.get(cat, 0) + 1
        return patterns
    
    def _get_tool_from_rule(self, rule: str) -> str:
        """Determine tool name from rule ID."""
        rule_lower = rule.lower()
        if rule.startswith('B') and rule[1:].isdigit():
            return "Bandit"
        elif rule.startswith('no-') or rule.startswith('@'):
            return "ESLint"
        elif rule.startswith('CS') or rule.startswith('CA'):
            return "Roslynator"
        elif 'cppcheck' in rule_lower:
            return "cppcheck"
        elif 'phpstan' in rule_lower:
            return "PHPStan"
        else:
            return "PMD"
    
    def _get_impact_description(self, category: IssueCategory) -> str:
        """Get impact description based on category."""
        impacts = {
            IssueCategory.SECURITY: "May expose the application to security vulnerabilities",
            IssueCategory.PERFORMANCE: "May affect application performance and efficiency",
            IssueCategory.STYLE: "Affects code readability and maintainability",
            IssueCategory.BEST_PRACTICE: "Deviation from recommended coding patterns",
        }
        return impacts.get(category, "May affect code quality")
    
    def _get_default_recommendation(self, issue: AnalysisIssue) -> str:
        """Get default recommendation based on issue type."""
        if issue.category == IssueCategory.SECURITY:
            return "Review this code for security implications and apply appropriate fixes to prevent vulnerabilities."
        elif issue.category == IssueCategory.PERFORMANCE:
            return "Consider optimizing this code section for better performance."
        elif issue.category == IssueCategory.STYLE:
            return "Refactor this code to follow established coding conventions."
        else:
            return "Review and apply the suggested best practice pattern."
