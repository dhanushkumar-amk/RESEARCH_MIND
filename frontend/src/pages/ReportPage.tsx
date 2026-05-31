import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Share2, Trash2, ArrowLeft,
  Calendar, BookOpen, ShieldCheck, ExternalLink,
  ChevronRight, Sparkles, Loader2, AlertCircle
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import reportsApi from '@/api/reports';
import { useToast } from '@/hooks/useToast';
import { ROUTES } from '@/constants';

const ReportPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError, info } = useToast();

  // 1. Fetch reports list
  const { data: reports = [], isLoading: loadingList, isError: errorList } = useQuery({
    queryKey: ['reports'],
    queryFn: reportsApi.getReports,
  });

  // 2. Fetch specific report detail if ID is specified
  const { data: reportDetail, isLoading: loadingDetail, isError: errorDetail } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.getReport(id!),
    enabled: !!id,
  });

  // 3. Delete report mutation
  const deleteMutation = useMutation({
    mutationFn: reportsApi.deleteReport,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      success('Report deleted successfully');
      navigate('/reports');
    },
    onError: (err: any) => {
      toastError(err.response?.data?.detail || err.message || 'Failed to delete report');
    }
  });

  const handleExportPDF = () => {
    window.print();
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    info('Public shareable link copied to clipboard!');
  };

  const handleDelete = (reportId: string) => {
    if (confirm('Are you sure you want to delete this research report?')) {
      void deleteMutation.mutateAsync(reportId);
    }
  };

  // Find summary details from the list for dates / titles if needed
  const selectedListReport = reports.find(r => r.id === id);

  // Parse report payload content
  const parseReportContent = (repObj: any) => {
    if (!repObj) return 'No content generated yet.';
    if (typeof repObj === 'string') return repObj;

    let markdown = '';
    if (repObj.executive_summary) {
      markdown += `### Executive Summary\n${repObj.executive_summary}\n\n`;
    }
    if (repObj.introduction) {
      markdown += `### Introduction\n${repObj.introduction}\n\n`;
    }
    if (repObj.detailed_findings || repObj.detailed_analysis || repObj.analysis) {
      markdown += `### Detailed Findings & Analysis\n${repObj.detailed_findings || repObj.detailed_analysis || repObj.analysis}\n\n`;
    }
    if (repObj.recommendations) {
      markdown += `### Recommendations\n${repObj.recommendations}\n\n`;
    }
    return markdown || JSON.stringify(repObj, null, 2);
  };

  if (id) {
    if (loadingDetail || loadingList) {
      return (
        <AppShell>
          <div className="h-[70vh] flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#16a34a]" />
            <p className="text-xs font-semibold text-neutral-500">Loading synthesized report data...</p>
          </div>
        </AppShell>
      );
    }

    const reportContent = reportDetail || selectedListReport?.report;
    const title = selectedListReport?.title || 'Synthesized Research Report';
    const date = selectedListReport ? new Date(selectedListReport.created_at).toLocaleDateString() : new Date().toLocaleDateString();
    const citations = reportContent?.citations || reportContent?.sources || [];

    if (!reportContent) {
      return (
        <AppShell>
          <div className="max-w-md mx-auto py-12 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <h3 className="text-lg font-bold text-neutral-900">Report Not Found</h3>
            <button onClick={() => navigate('/reports')} className="bg-neutral-950 text-white font-bold px-4 py-2 rounded-xl text-xs">
              Go to Directory
            </button>
          </div>
        </AppShell>
      );
    }

    return (
      <AppShell>
        <div className="max-w-[1000px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased print:p-0 print:m-0">
          
          {/* Back navigation & Actions row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4 print:hidden">
            <button 
              onClick={() => navigate('/reports')}
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-550 hover:text-green-655 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Directory
            </button>
            
            <div className="flex items-center gap-2.5">
              <button 
                onClick={handleExportPDF}
                className="bg-white border border-neutral-200 hover:border-neutral-350 text-neutral-705 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Download className="h-4 w-4 text-neutral-500" />
                <span>Export PDF</span>
              </button>
              <button 
                onClick={handleShareLink}
                className="bg-white border border-neutral-200 hover:border-neutral-350 text-neutral-705 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Share2 className="h-4 w-4 text-neutral-500" />
                <span>Share Link</span>
              </button>
              <button 
                onClick={() => handleDelete(id)}
                className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all border border-red-100 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* Report metadata block */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4 relative overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-neutral-450 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {date}</span>
              <span>•</span>
              <span>Grounded Analysis</span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-neutral-900 tracking-tight leading-tight">
              {title}
            </h1>
          </div>

          {/* Report Body Content */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 lg:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.01)] prose prose-neutral max-w-none">
            <div className="space-y-6 text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap font-medium">
              {parseReportContent(reportContent)}
            </div>
          </div>

          {/* Citations section */}
          {citations.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4 print:break-inside-avoid">
              <h2 className="font-bold text-sm text-neutral-900 border-b border-neutral-100 pb-3 flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-[#16a34a]" />
                Citations & Grounded Sources
              </h2>

              <div className="space-y-2">
                {citations.map((cite: any, idx: number) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-2.5 p-3 hover:bg-neutral-50 rounded-xl transition-colors border border-neutral-100 text-xs font-semibold text-neutral-705"
                  >
                    <span className="h-5 w-5 bg-neutral-100 rounded-full flex items-center justify-center font-bold text-[10px] text-neutral-500 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{typeof cite === 'string' ? cite : (cite.title || cite.url || JSON.stringify(cite))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </AppShell>
    );
  }

  // Render Directory
  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            Synthesized Research Reports
            {loadingList && <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />}
          </h1>
          <p className="text-sm text-neutral-500 mt-1 font-medium">
            Access and export past comprehensive research reports synthesized by ResearchMind.
          </p>
        </div>

        {reports.length === 0 ? (
          <div className="p-12 text-center bg-white border border-neutral-200 rounded-2xl max-w-md mx-auto space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <FileText className="h-10 w-10 text-neutral-350 mx-auto" />
            <h3 className="font-bold text-neutral-800">No reports generated yet</h3>
            <p className="text-xs text-neutral-450">Run a deep research query in the workspace to synthesize your first report document.</p>
            <button onClick={() => navigate(ROUTES.RESEARCH)} className="bg-neutral-950 text-white font-bold text-xs px-4 py-2 rounded-xl">
              Start Research
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((rep) => (
              <div 
                key={rep.id} 
                className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.03)] hover:border-neutral-350 transition-all flex flex-col justify-between gap-5 cursor-pointer"
                onClick={() => navigate(`/report/${rep.id}`)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(rep.created_at).toLocaleDateString()}</span>
                    <span>Synthesis Report</span>
                  </div>
                  <h3 className="font-extrabold text-base text-neutral-900 line-clamp-1">{rep.title}</h3>
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed font-semibold">
                    {rep.report?.executive_summary || 'No summary available.'}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-bold">
                      Grounded
                    </span>
                    <span className="text-[10px] text-neutral-450 font-semibold">LangGraph Sync</span>
                  </div>
                  
                  <span className="text-xs font-bold text-[#16a34a] flex items-center gap-1 group">
                    View Report
                    <ChevronRight className="h-4.5 w-4.5 group-hover:translate-x-0.5 transition-all" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default ReportPage;
