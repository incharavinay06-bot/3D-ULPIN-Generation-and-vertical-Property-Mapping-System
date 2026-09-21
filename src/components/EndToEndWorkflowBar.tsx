import React from 'react';
import { 
  MapPin, 
  Upload, 
  Zap, 
  Layers, 
  Box, 
  Key, 
  Droplets, 
  ShieldAlert,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

export interface WorkflowStep {
  stepNumber: number;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  actionId: string;
}

interface EndToEndWorkflowBarProps {
  currentStep: number;
  onStepClick: (stepNumber: number) => void;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { stepNumber: 1, label: 'Select Location', shortLabel: '1. Location', icon: MapPin, actionId: 'select-location' },
  { stepNumber: 2, label: 'Import / Acquire Data', shortLabel: '2. Acquire', icon: Upload, actionId: 'acquire-data' },
  { stepNumber: 3, label: 'AI Building Extraction', shortLabel: '3. AI Extract', icon: Zap, actionId: 'ai-building' },
  { stepNumber: 4, label: 'Floor Segmentation', shortLabel: '4. Segment', icon: Layers, actionId: 'floor-segment' },
  { stepNumber: 5, label: 'Generate 3D Cadastre', shortLabel: '5. 3D Cadastre', icon: Box, actionId: 'view-3d' },
  { stepNumber: 6, label: 'Assign 3D ULPIN', shortLabel: '6. 3D ULPIN', icon: Key, actionId: 'assign-ulpin' },
  { stepNumber: 7, label: 'Underground Infra', shortLabel: '7. Sub-surface', icon: Droplets, actionId: 'underground' },
  { stepNumber: 8, label: 'Topology Validation', shortLabel: '8. Validate', icon: ShieldAlert, actionId: 'validate' },
];

export const EndToEndWorkflowBar: React.FC<EndToEndWorkflowBarProps> = ({
  currentStep,
  onStepClick,
}) => {
  return (
    <div id="end-to-end-workflow-bar" className="w-full bg-slate-950/90 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between overflow-x-auto scrollbar-none select-none backdrop-blur-md">
      <div className="flex items-center gap-1 min-w-max mx-auto">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 hidden lg:inline font-mono">
          SIH End-to-End Pipeline:
        </span>

        {WORKFLOW_STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.stepNumber;
          const isCompleted = currentStep > step.stepNumber;

          return (
            <React.Fragment key={step.stepNumber}>
              <button
                onClick={() => onStepClick(step.stepNumber)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-400'
                    : isCompleted
                      ? 'bg-slate-900/80 text-emerald-300 border border-emerald-500/30 hover:bg-slate-800'
                      : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800'
                }`}
                title={step.label}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <StepIcon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                )}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.shortLabel}</span>
              </button>

              {idx < WORKFLOW_STEPS.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
