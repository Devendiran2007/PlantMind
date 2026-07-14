from generators.base_generator import BaseGenerator

class OEMManualGenerator(BaseGenerator):
    def generate(self, doc_data):
        self.generate_pdf(doc_data, "OEM_Manuals")
        self.generate_docx(doc_data, "OEM_Manuals")

class MaintenanceReportGenerator(BaseGenerator):
    def generate(self, doc_data):
        self.generate_pdf(doc_data, "Maintenance")
        self.generate_docx(doc_data, "Maintenance")

class IncidentReportGenerator(BaseGenerator):
    def generate(self, doc_data):
        self.generate_pdf(doc_data, "Incidents")
        self.generate_docx(doc_data, "Incidents")

class InspectionReportGenerator(BaseGenerator):
    def generate(self, doc_data):
        self.generate_pdf(doc_data, "Inspection")
        self.generate_docx(doc_data, "Inspection")

class SOPDocumentGenerator(BaseGenerator):
    def generate(self, doc_data):
        self.generate_pdf(doc_data, "SOP")
        self.generate_docx(doc_data, "SOP")

class WorkOrderGenerator(BaseGenerator):
    def generate(self, doc_data):
        self.generate_pdf(doc_data, "WorkOrders")
        self.generate_docx(doc_data, "WorkOrders")

class AuditReportGenerator(BaseGenerator):
    def generate(self, doc_data):
        self.generate_pdf(doc_data, "Audit")
        self.generate_docx(doc_data, "Audit")

class ComplianceReportGenerator(BaseGenerator):
    def generate(self, doc_data):
        self.generate_pdf(doc_data, "Compliance")
        self.generate_docx(doc_data, "Compliance")

class ShiftLogGenerator(BaseGenerator):
    def generate(self, doc_data):
        self.generate_pdf(doc_data, "ShiftLogs")
        self.generate_docx(doc_data, "ShiftLogs")

class DailyOperatorLogGenerator(BaseGenerator):
    def generate(self, doc_data):
        # Maps to ShiftLogs folder as well
        self.generate_pdf(doc_data, "ShiftLogs")
        self.generate_docx(doc_data, "ShiftLogs")

class LubricationReportGenerator(BaseGenerator):
    def generate(self, doc_data):
        # Maps to Maintenance folder as requested or Maintenance/
        self.generate_pdf(doc_data, "Maintenance")
        self.generate_docx(doc_data, "Maintenance")

class VibrationReportGenerator(BaseGenerator):
    def generate(self, doc_data):
        # Maps to Inspection/ or Maintenance/
        self.generate_pdf(doc_data, "Inspection")
        self.generate_docx(doc_data, "Inspection")

class RiskAssessmentGenerator(BaseGenerator):
    def generate(self, doc_data):
        self.generate_pdf(doc_data, "RiskAssessment")
        self.generate_docx(doc_data, "RiskAssessment")

class TrainingRecordGenerator(BaseGenerator):
    def generate(self, doc_data):
        self.generate_pdf(doc_data, "Training")
        self.generate_docx(doc_data, "Training")

class CalibrationReportGenerator(BaseGenerator):
    def generate(self, doc_data):
        self.generate_pdf(doc_data, "Calibration")
        self.generate_docx(doc_data, "Calibration")

class EmailGenerator(BaseGenerator):
    def generate(self, doc_data):
        self.generate_pdf(doc_data, "Emails")
        self.generate_docx(doc_data, "Emails")
