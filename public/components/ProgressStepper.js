/**
 * Gestor del Stepper de Progreso
 * Maneja la visualización del progreso del flujo de trabajo
 */
class ProgressStepper {
    constructor() {
        this.stepper = document.getElementById('progressStepper');
        this.steps = this.stepper ? this.stepper.querySelectorAll('.step') : [];
        this.currentStep = 1;
    }

    updateStep(stepNumber) {
        if (!this.stepper || !this.steps.length) return;
        
        this.currentStep = stepNumber;
        
        this.steps.forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNum < stepNumber) {
                step.classList.add('completed');
            } else if (stepNum === stepNumber) {
                step.classList.add('active');
            }
        });
    }

    recordingCompleted() {
        this.updateStep(2);
    }

    transcriptionCompleted() {
        this.updateStep(3);
    }

    processingCompleted() {
        this.updateStep(4);
    }

    sessionSaved() {
        this.updateStep(4);
        // Marcar como completado
        if (this.steps[3]) {
            this.steps[3].classList.add('completed');
        }
    }

    reset() {
        this.updateStep(1);
    }

    startTranscription() {
        this.updateStep(2);
    }
}