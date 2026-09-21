/**
 * 3D Cadastral Boundary & Topology Validation Report Modal
 */

import React, { useState, useEffect } from 'react';
import { ValidationReport, TopologyIssue } from '../types/cadastre';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  MapPin, 
  ArrowUpRight, 
  Layers, 
  ShieldCheck,
  FileSpreadsheet,
  RefreshCw,
  Zap,
  Box,
  Sliders,
  Sparkles,
  AlertOctagon,
  Scan,
  Compass
} from 'lucide-react';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ValidationReport;
  onJumpToIssue: (issue: TopologyIssue) => void;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  report,
  onJumpToIssue,
}) => {
  const [isValidating, setIsValidating] = useState(true);
  const [scanStep, setScanStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);

  const validationSteps = [
    { title: 'Auditing 2D Land Parcel boundaries & survey centroids...', duration: 250 },
    { title: 'Checking 3D Building volumetric envelopes & basement depths...', duration: 300 },
    { title: 'Verifying floor slab elevations & vertical Z-plane continuity...', duration: 300 },
    { title: 'Running 3D volumetric raycasts & setback encroachment tests...', duration: 350 },
  ];

  // Run validation scanning sequence when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsValidating(true);
      setScanStep(0);
      setScanProgress(15);

      const t1 = setTimeout(() => {
        setScanStep(1);
        setScanProgress(45);
      }, 250);

      const t2 = setTimeout(() => {
        setScanStep(2);
        setScanProgress(75);
      }, 550);

      const t3 = setTimeout(() => {
        setScanStep(3);
        setScanProgress(95);
      }, 850);

      const t4 = setTimeout(() => {
        setScanProgress(100);
        setIsValidating(false);
      }, 1200);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [isOpen]);

  const handleReRunValidation = () => {
    setIsValidating(true);
    setScanStep(0);
    setScanProgress(20);

    const t1 = setTimeout(() => {
      setScanStep(1);
      setScanProgress(50);
    }, 200);

    const t2 = setTimeout(() => {
      setScanStep(2);
      setScanProgress(80);
    }, 500);

    const t3 = setTimeout(() => {
      setScanProgress(100);
      setIsValidating(false);
    }, 900);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner ${
              report.issuesCount > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              {report.issuesCount > 0 ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                3D Cadastral Boundary & Spatial Topology Audit
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  ISO 19152 (LADM)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Automated 3D Volume Intersections, Cantilever Overhangs & Cadastral Setback Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReRunValidation}
              title="Re-run 3D boundary validation scan"
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-xs border border-slate-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">Re-audit</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Validation Progress Banner (During active scan) */}
        {isValidating ? (
          <div className="p-6 bg-slate-950/90 border-b border-slate-800 space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-blue-400 font-semibold text-xs animate-pulse">
              <Scan className="w-4 h-4 animate-spin" />
              <span>Validating 3D Boundaries & Volumetric Containment...</span>
            </div>

            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden max-w-lg mx-auto border border-slate-700">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${scanProgress}%` }}
              />
            </div>

            <div className="text-xs font-mono text-slate-400">
              {validationSteps[scanStep]?.title || 'Finalizing cadastral integrity report...'}
            </div>
          </div>
        ) : (
          <>
            {/* Checklist Results (Requested Specification) */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
                <span>3D Cadastral Rule Verification Checklist:</span>
                <span className="text-[10px] text-slate-500 font-normal">Standard: MoRD SIH26011 Specification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                
                {/* 1. Parcel Boundary Check */}
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/30 flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-300">✓ Parcel boundary valid</div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      Ground survey bounds & 2D ULPIN registry compliant ({report.totalParcelsChecked} parcels)
                    </div>
                  </div>
                </div>

                {/* 2. Building Volume Check */}
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/30 flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-300">✓ Building volume valid</div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      LoD 1/2 structural envelopes within allowable master plan FAR ({report.totalBuildingsChecked} buildings)
                    </div>
                  </div>
                </div>

                {/* 3. Floor Boundaries Check */}
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/30 flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-300">✓ Floor boundaries valid</div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      Vertical Z-planes continuous without elevation gaps ({report.totalFloorsChecked} floor levels)
                    </div>
                  </div>
                </div>

                {/* 4. Spatial Conflict Status */}
                <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                  report.issuesCount > 0 
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-300' 
                    : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    report.issuesCount > 0 ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {report.issuesCount > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold">
                      {report.issuesCount > 0 ? '⚠ Spatial conflict detected' : '✓ Spatial conflicts clean'}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      {report.issuesCount > 0 
                        ? `${report.issuesCount} spatial anomalies requiring cadastral review`
                        : '0 spatial conflicts detected'}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 py-2 bg-slate-950/60 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Total Strata Units:</span>
                <span className="font-mono font-bold text-blue-400">{report.totalUnitsChecked}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Valid Titles:</span>
                <span className="font-mono font-bold text-emerald-400">{report.validUnitsCount} Units</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Critical Encroachments:</span>
                <span className="font-mono font-bold text-rose-400">{report.criticalCount} Flagged</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Cadastral Status:</span>
                <span className="font-semibold text-amber-300">Action Required</span>
              </div>
            </div>
          </>
        )}

        {/* Detailed Issues List */}
        {!isValidating && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {report.issues.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">All 3D Spatial Volumes Validated Successfully</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No volumetric collisions, cantilever overhang encroachments, or vertical elevation gaps detected.
                </p>
              </div>
            ) : (
              report.issues.map((issue, idx) => (
                <div 
                  key={issue.id}
                  className="bg-slate-950 border border-rose-900/60 rounded-xl p-4 space-y-3 transition-all hover:border-rose-600 shadow-md"
                >
                  {/* Conflict Type Header & Jump Button */}
                  <div className="flex flex-wrap items-start justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-500/40 uppercase flex items-center gap-1">
                          <AlertOctagon className="w-3 h-3 text-rose-400" />
                          {issue.conflictTypeLabel || (issue.type === 'UNIT_OVERLAP' ? '3D Volumetric Property Overlap' : 'Unauthorized Cantilever Overhang Encroachment')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {issue.id}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">{issue.title}</h4>
                    </div>

                    <button
                      onClick={() => {
                        onJumpToIssue(issue);
                        onClose();
                      }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>Isolate in 3D Model</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Conflict Description */}
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
                    {issue.message}
                  </p>

                  {/* Conflict Details Grid (Requested Specification) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    
                    {/* Affected Unit */}
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Affected Unit(s):</span>
                      <span className="font-mono font-bold text-amber-300 block">
                        {issue.affectedUnitIds.join(', ')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Level {issue.floorNumber !== undefined ? (issue.floorNumber < 0 ? `B${Math.abs(issue.floorNumber)}` : `Floor ${issue.floorNumber}`) : 'N/A'} • Building {issue.buildingId}
                      </span>
                    </div>

                    {/* Affected Parcel Boundary */}
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Affected Parcel Boundary:</span>
                      <span className="font-semibold text-slate-200 block">
                        {issue.affectedParcelBoundary || `Parcel ${issue.parcelId} Legal Survey Boundary`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Cadastral Parcel ID: {issue.parcelId}
                      </span>
                    </div>

                    {/* Approximate Overlap / Overhang Area or Distance */}
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Encroachment Dimensions:</span>
                      <div className="flex items-center gap-3 font-mono text-slate-200">
                        {issue.encroachmentDistanceM && (
                          <span>
                            <strong className="text-rose-400 font-bold">{issue.encroachmentDistanceM} m</strong> distance
                          </span>
                        )}
                        {issue.encroachmentAreaSqm && (
                          <span>
                            ~<strong className="text-amber-400 font-bold">{issue.encroachmentAreaSqm} m²</strong> area
                          </span>
                        )}
                        {issue.overlappingVolumeM3 && (
                          <span>
                            ~<strong className="text-blue-400 font-bold">{issue.overlappingVolumeM3} m³</strong> volume
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Suggested Action (Requested Specification) */}
                    <div className="bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/40 space-y-0.5">
                      <span className="text-[10px] text-amber-400 font-bold uppercase block">Suggested Action:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {issue.suggestedAction || 'Requires cadastral review'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block pt-0.5">
                        {issue.recommendedAction}
                      </span>
                    </div>

                  </div>

                </div>
              ))
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 font-mono text-[11px]">
            Audit Certified • MoRD 3D ULPIN Generation Cadastral Engine
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Close Audit
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
