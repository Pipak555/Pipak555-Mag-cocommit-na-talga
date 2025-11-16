import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Shield, FileText, AlertTriangle, Printer, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/shared/BackButton";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Policies = () => {
  const navigate = useNavigate();
  const [cancellationPolicy, setCancellationPolicy] = useState(`CANCELLATION POLICY

1. GUEST CANCELLATION POLICY:
   
   Flexible Cancellation (48+ hours before check-in):
   - Full refund of all fees paid
   - No cancellation charges
   - Instant refund processing (3-5 business days)
   
   Moderate Cancellation (24-48 hours before check-in):
   - 50% refund of the total booking amount
   - Refund processed within 5-7 business days
   
   Strict Cancellation (Less than 24 hours before check-in):
   - No refund will be provided
   - All fees are non-refundable
   - Booking is considered final

2. HOST CANCELLATION POLICY:
   
   Standard Cancellation Window:
   - Hosts may cancel bookings up to 7 days before check-in without penalty
   - Hosts must provide a valid reason for cancellation
   - Platform will automatically notify affected guests
   
   Last-Minute Host Cancellations (Less than 7 days):
   - Automatic full refund to guest (including all fees)
   - Host account may be temporarily suspended
   - Review of host account status required
   - Potential removal from platform for repeated violations
   
   Repeated Cancellation Policy:
   - First cancellation: Warning notification
   - Second cancellation within 6 months: 7-day account suspension
   - Third cancellation within 6 months: 30-day account suspension
   - Fourth cancellation within 6 months: Permanent account removal

3. EMERGENCY CANCELLATIONS:
   
   Extenuating Circumstances:
   - Natural disasters, government travel restrictions, or medical emergencies
   - Must provide documentation within 48 hours
   - Full refund may be granted at platform's discretion
   - Case-by-case review process

4. REFUND PROCESSING:
   - All refunds processed to original payment method
   - Processing time: 3-10 business days depending on payment provider
   - Guests will receive email confirmation upon refund initiation
   - Hosts will be notified of any cancellation-related actions`);

  const [termsOfService, setTermsOfService] = useState(`TERMS OF SERVICE

1. USER ELIGIBILITY AND ACCOUNT REQUIREMENTS:
   
   Age Requirement:
   - All users must be at least 18 years of age
   - Users under 18 must have parental consent and supervision
   - False age representation will result in immediate account termination
   
   Account Information:
   - Provide accurate, current, and complete information
   - Maintain and promptly update account information
   - You are responsible for maintaining account security
   - Notify us immediately of any unauthorized account access
   
   Account Responsibilities:
   - One account per person (no duplicate accounts)
   - Account sharing is strictly prohibited
   - You are responsible for all activities under your account

2. HOST OBLIGATIONS AND RESPONSIBILITIES:
   
   Property Listings:
   - All property descriptions must be accurate and truthful
   - Photos must represent the actual property condition
   - Disclose any known issues, restrictions, or limitations
   - Update availability calendar in real-time
   - Maintain property in safe, clean, and habitable condition
   
   Booking Management:
   - Honor all confirmed bookings without exception
   - Provide clear and accurate check-in instructions
   - Respond to guest inquiries within 24 hours
   - Be available or provide emergency contact during guest stays
   - Ensure property meets all local safety and health regulations
   
   Pricing and Fees:
   - Set fair and competitive pricing
   - All fees must be clearly disclosed in listing
   - No hidden charges or surprise fees allowed

3. GUEST OBLIGATIONS AND RESPONSIBILITIES:
   
   Booking Requirements:
   - Provide accurate guest count and information
   - Respect maximum occupancy limits
   - Follow all house rules and property guidelines
   - Treat property with care and respect
   
   Payment Obligations:
   - Pay all fees in full and on time
   - Understand cancellation policies before booking
   - Payment disputes must be reported within 48 hours
   
   Property Care:
   - Report any damages immediately to host
   - Leave property in same condition as received
   - Follow check-out procedures as specified

4. PLATFORM USAGE RULES:
   
   Prohibited Activities:
   - No illegal activities of any kind
   - No discrimination based on race, religion, gender, sexual orientation, or disability
   - No harassment, abuse, or threatening behavior
   - No fraudulent transactions or chargebacks
   - No circumventing platform fees or direct booking arrangements
   - No spam, phishing, or malicious content
   
   Content Guidelines:
   - No false, misleading, or defamatory content
   - No copyrighted material without permission
   - No inappropriate, offensive, or illegal content
   - Respect intellectual property rights

5. LIABILITY AND DISCLAIMERS:
   
   Platform Role:
   - We act as an intermediary connecting hosts and guests
   - We are not responsible for property conditions or guest experiences
   - We do not guarantee property availability or accuracy
   - We are not liable for disputes between hosts and guests
   
   User Responsibility:
   - Users are solely responsible for their own safety
   - Users assume all risks associated with property use
   - Platform is not liable for personal injury or property damage
   - Users must comply with all local laws and regulations
   
   Insurance:
   - Hosts are strongly encouraged to maintain property insurance
   - Guests are encouraged to obtain travel insurance
   - Platform provides limited protection but is not a substitute for insurance

6. PAYMENT PROCESSING:
   
   Payment Methods:
   - We accept various payment methods as displayed
   - All payments are processed securely through third-party providers
   - Platform holds payments until check-in confirmation
   
   Refunds and Disputes:
   - Refunds processed according to cancellation policy
   - Disputes must be reported within 48 hours of check-in
   - Platform reserves right to mediate disputes
   - Final decisions on disputes are at platform's discretion

7. TERMINATION AND SUSPENSION:
   
   Account Termination:
   - We reserve the right to suspend or terminate accounts for policy violations
   - Repeated violations may result in permanent ban
   - No refunds for terminated accounts
   - Users may appeal termination decisions

8. MODIFICATIONS TO TERMS:
   - We reserve the right to modify these terms at any time
   - Users will be notified of significant changes
   - Continued use of platform constitutes acceptance of modified terms`);

  const [houseRules, setHouseRules] = useState(`HOUSE RULES & REGULATIONS

1. GUEST CONDUCT AND BEHAVIOR:
   
   Noise and Disturbance:
   - Respect quiet hours (typically 10 PM - 8 AM, unless otherwise specified)
   - Keep noise levels reasonable at all times
   - No loud music, parties, or disruptive activities
   - Be considerate of neighbors and surrounding community
   - Excessive noise complaints may result in immediate eviction without refund
   
   Smoking Policy:
   - No smoking inside the property unless explicitly stated in listing
   - If smoking is allowed, use designated outdoor areas only
   - Dispose of cigarette butts properly
   - Violation of smoking policy may result in additional cleaning fees ($200+)
   
   Occupancy Limits:
   - Maximum guest count must be strictly respected
   - No unregistered guests or visitors without host approval
   - Additional guests may result in extra charges or eviction
   - Host must be notified of any changes to guest count
   
   Parties and Events:
   - No parties, events, or gatherings without explicit written host permission
   - Small gatherings may be allowed with prior approval
   - Violation of this rule may result in immediate eviction and $500+ fine
   - Security deposits may be forfeited for party-related damages

2. PROPERTY CARE AND MAINTENANCE:
   
   Damage Reporting:
   - Report any damages, malfunctions, or issues immediately to host
   - Take photos of any existing damage upon arrival
   - Failure to report damages may result in charges
   - Accidental damage should be reported within 24 hours
   
   Cleanliness Standards:
   - Keep property clean and tidy during stay
   - Clean up after yourself in common areas
   - Wash dishes and clean kitchen after use
   - Excessive mess may result in additional cleaning fees
   
   Waste Management:
   - Dispose of trash in designated bins
   - Follow local recycling guidelines
   - Do not leave trash outside property
   - Large items must be disposed of properly (contact host)
   
   Check-Out Procedures:
   - Check-out time must be strictly adhered to (typically 11 AM)
   - Remove all personal belongings
   - Return keys/access codes as instructed
   - Leave property in reasonable condition
   - Late check-out may result in additional charges

3. SECURITY AND SAFETY:
   
   Access and Entry:
   - Lock all doors and windows when leaving property
   - Do not share access codes, keys, or entry information with unauthorized persons
   - Report lost keys or compromised access immediately
   - Unauthorized access sharing may result in account termination
   
   Security Measures:
   - Do not tamper with security systems or cameras
   - Report any suspicious activity to host and local authorities
   - Keep emergency contact information accessible
   - Follow all safety instructions provided by host
   
   Emergency Procedures:
   - Familiarize yourself with emergency exits and procedures
   - Know location of fire extinguishers and first aid kits
   - Contact emergency services (911) for life-threatening situations
   - Notify host of any emergencies immediately

4. HOST RESPONSIBILITIES AND OBLIGATIONS:
   
   Property Standards:
   - Ensure property meets all local safety and health codes
   - Maintain property in clean, safe, and habitable condition
   - Provide working smoke detectors, carbon monoxide detectors, and fire extinguishers
   - Address any safety hazards immediately
   
   Information and Communication:
   - Provide accurate and detailed property descriptions
   - Maintain up-to-date availability calendar
   - Provide clear check-in instructions at least 24 hours before arrival
   - Respond to guest inquiries within 24 hours
   - Be available or provide emergency contact during guest stays
   
   Guest Support:
   - Address guest concerns and issues promptly
   - Provide necessary amenities as listed
   - Ensure property matches listing description
   - Handle maintenance issues in a timely manner
   - Provide local recommendations and assistance when requested

5. PROHIBITED ITEMS AND ACTIVITIES:
   
   Illegal Activities:
   - No illegal drugs or substances
   - No illegal activities of any kind
   - No weapons or dangerous items
   - Violation may result in immediate eviction and law enforcement notification
   
   Property Modifications:
   - No alterations to property without written permission
   - No moving furniture or fixtures
   - No painting, drilling, or permanent changes
   - No removal of property items
   
   Pets:
   - Pets only allowed if explicitly stated in listing
   - Service animals are always welcome (documentation may be required)
   - Pet fees and rules apply as specified
   - Unauthorized pets may result in immediate eviction and fees

6. ADDITIONAL FEES AND CHARGES:
   
   Violation Fees:
   - Smoking violation: $200+ cleaning fee
   - Unauthorized party: $500+ fine + potential eviction
   - Excessive cleaning required: $100-300 cleaning fee
   - Late check-out: $50 per hour
   - Lost keys/access: $100 replacement fee
   
   Damage Charges:
   - Guests are responsible for all damages caused during stay
   - Security deposit may be used to cover damages
   - Additional charges may apply for damages exceeding deposit
   - All charges will be clearly itemized and communicated

7. DISPUTE RESOLUTION:
   
   Communication:
   - All issues should first be addressed directly with host/guest
   - Document all communications and issues
   - Platform mediation available for unresolved disputes
   
   Resolution Process:
   - Report disputes within 48 hours of incident
   - Provide evidence (photos, messages, etc.)
   - Platform will review and make final determination
   - Both parties must comply with platform decisions`);

  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');

  // Format text for display (convert plain text to formatted sections)
  const formatPolicyText = (text: string): string[] => {
    return text.split('\n').filter(line => line.trim() !== '');
  };

  // Escape HTML for safe rendering
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Print function
  const handlePrint = (policyType: 'cancellation' | 'terms' | 'rules' | 'all') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print documents');
      return;
    }

    let content = '';
    let title = '';

    if (policyType === 'all') {
      title = 'All Policies & Compliance Documents';
      content = `
        <div style="page-break-after: always;">
          <h1 style="text-align: center; font-size: 24px; margin-bottom: 10px; color: #1e40af;">CANCELLATION POLICY</h1>
          <div style="white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.6; font-size: 12px;">${escapeHtml(cancellationPolicy)}</div>
        </div>
        <div style="page-break-after: always;">
          <h1 style="text-align: center; font-size: 24px; margin-bottom: 10px; color: #1e40af;">TERMS OF SERVICE</h1>
          <div style="white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.6; font-size: 12px;">${escapeHtml(termsOfService)}</div>
        </div>
        <div>
          <h1 style="text-align: center; font-size: 24px; margin-bottom: 10px; color: #1e40af;">HOUSE RULES & REGULATIONS</h1>
          <div style="white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.6; font-size: 12px;">${escapeHtml(houseRules)}</div>
        </div>
      `;
    } else {
      const policies = {
        cancellation: { title: 'CANCELLATION POLICY', content: cancellationPolicy },
        terms: { title: 'TERMS OF SERVICE', content: termsOfService },
        rules: { title: 'HOUSE RULES & REGULATIONS', content: houseRules }
      };
      title = policies[policyType].title;
      content = escapeHtml(policies[policyType].content);
    }

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 2cm;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .page-break {
                page-break-after: always;
              }
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #1e40af;
            }
            .header h1 {
              color: #1e40af;
              font-size: 28px;
              margin: 0 0 10px 0;
              font-weight: bold;
            }
            .header .subtitle {
              color: #666;
              font-size: 14px;
              margin-top: 5px;
            }
            .content {
              white-space: pre-wrap;
              font-size: 12px;
              line-height: 1.8;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-weight: bold;
              font-size: 14px;
              color: #1e40af;
              margin-top: 20px;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <div class="subtitle">Generated: ${new Date().toLocaleString()}</div>
            <div class="subtitle">Firebnb Platform - Policies & Compliance</div>
          </div>
          <div class="content">${content}</div>
          <div class="footer">
            <p>This document is confidential and proprietary to Firebnb Platform.</p>
            <p>Page generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    
    toast.success('Print dialog opened');
  };

  // PDF Export function
  const handleExportPDF = (policyType: 'cancellation' | 'terms' | 'rules' | 'all') => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      let yPos = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);

      const addHeader = (title: string) => {
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 64, 175); // Blue color
        const titleWidth = doc.getTextWidth(title);
        doc.text(title, (pageWidth - titleWidth) / 2, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        const dateText = `Generated: ${new Date().toLocaleString()}`;
        const dateWidth = doc.getTextWidth(dateText);
        doc.text(dateText, (pageWidth - dateWidth) / 2, yPos);
        yPos += 5;
        
        const platformText = 'Firebnb Platform - Policies & Compliance';
        const platformWidth = doc.getTextWidth(platformText);
        doc.text(platformText, (pageWidth - platformWidth) / 2, yPos);
        yPos += 15;
        
        // Draw line
        doc.setDrawColor(30, 64, 175);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;
      };

      const addContent = (text: string) => {
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        
        const lines = doc.splitTextToSize(text, maxWidth);
        const lineHeight = 6;
        
        lines.forEach((line: string) => {
          if (yPos > doc.internal.pageSize.getHeight() - 30) {
            doc.addPage();
            yPos = 20;
          }
          
          // Check if line is a section header (starts with number and period)
          if (/^\d+\.\s+[A-Z]/.test(line.trim())) {
            yPos += 5;
            doc.setFont(undefined, 'bold');
            doc.setFontSize(12);
            doc.setTextColor(30, 64, 175);
            doc.text(line, margin, yPos);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
          } else if (/^[A-Z][A-Z\s&]+:/.test(line.trim())) {
            yPos += 3;
            doc.setFont(undefined, 'bold');
            doc.text(line, margin, yPos);
            doc.setFont(undefined, 'normal');
          } else {
            doc.text(line, margin, yPos);
          }
          
          yPos += lineHeight;
        });
        
        yPos += 10;
      };

      if (policyType === 'all') {
        addHeader('CANCELLATION POLICY');
        addContent(cancellationPolicy);
        doc.addPage();
        yPos = 20;
        
        addHeader('TERMS OF SERVICE');
        addContent(termsOfService);
        doc.addPage();
        yPos = 20;
        
        addHeader('HOUSE RULES & REGULATIONS');
        addContent(houseRules);
      } else {
        const policies = {
          cancellation: { title: 'CANCELLATION POLICY', content: cancellationPolicy },
          terms: { title: 'TERMS OF SERVICE', content: termsOfService },
          rules: { title: 'HOUSE RULES & REGULATIONS', content: houseRules }
        };
        addHeader(policies[policyType].title);
        addContent(policies[policyType].content);
      }

      // Add footer to each page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
        doc.text(
          'Firebnb Platform - Confidential Document',
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 5,
          { align: 'center' }
        );
      }

      const filename = policyType === 'all' 
        ? `all-policies-${Date.now()}.pdf`
        : `${policyType}-policy-${Date.now()}.pdf`;
      
      doc.save(filename);
      toast.success('PDF exported successfully');
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      toast.error(`Failed to export PDF: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  // CSV Export function
  const handleExportCSV = (policyType: 'cancellation' | 'terms' | 'rules' | 'all') => {
    setExporting(true);
    try {
      let csvContent = '';
      let filename = '';

      if (policyType === 'all') {
        filename = `all-policies-${Date.now()}.csv`;
        csvContent = `Policy Type,Section,Content\n`;
        
        // Cancellation Policy
        const cancelLines = cancellationPolicy.split('\n').filter(line => line.trim());
        cancelLines.forEach(line => {
          const section = line.match(/^\d+\.\s+(.+)/)?.[1] || '';
          csvContent += `"Cancellation Policy","${section}","${line.replace(/"/g, '""')}"\n`;
        });
        
        // Terms of Service
        const termsLines = termsOfService.split('\n').filter(line => line.trim());
        termsLines.forEach(line => {
          const section = line.match(/^\d+\.\s+(.+)/)?.[1] || '';
          csvContent += `"Terms of Service","${section}","${line.replace(/"/g, '""')}"\n`;
        });
        
        // House Rules
        const rulesLines = houseRules.split('\n').filter(line => line.trim());
        rulesLines.forEach(line => {
          const section = line.match(/^\d+\.\s+(.+)/)?.[1] || '';
          csvContent += `"House Rules & Regulations","${section}","${line.replace(/"/g, '""')}"\n`;
        });
      } else {
        const policies = {
          cancellation: { title: 'Cancellation Policy', content: cancellationPolicy },
          terms: { title: 'Terms of Service', content: termsOfService },
          rules: { title: 'House Rules & Regulations', content: houseRules }
        };
        
        filename = `${policyType}-policy-${Date.now()}.csv`;
        csvContent = `Section,Content\n`;
        
        const lines = policies[policyType].content.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const section = line.match(/^\d+\.\s+(.+)/)?.[1] || '';
          csvContent += `"${section}","${line.replace(/"/g, '""')}"\n`;
        });
      }

      // Create and download file
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('CSV exported successfully');
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      toast.error(`Failed to export CSV: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExport = (policyType: 'cancellation' | 'terms' | 'rules' | 'all') => {
    if (exportFormat === 'pdf') {
      handleExportPDF(policyType);
    } else {
      handleExportCSV(policyType);
    }
  };

  const handleSave = () => {
    // In a real app, save to Firestore
    toast.success("Policies updated successfully");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <BackButton to="/admin/dashboard" className="mb-6" />

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Policies & Compliance</h1>
              <p className="text-muted-foreground">
                Manage, view, download, and print platform rules, regulations, and policies
              </p>
            </div>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </Button>
          </div>
          
          {/* Print & Export Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Print & Export Documents
              </CardTitle>
              <CardDescription>
                Print or export all policies and compliance documents in various formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Export Format</label>
                  <Select value={exportFormat} onValueChange={(value: 'pdf' | 'csv') => setExportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF (Portable Document Format)</SelectItem>
                      <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => handlePrint('all')}
                    variant="outline"
                    disabled={exporting}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print All
                  </Button>
                  <Button
                    onClick={() => handleExport('all')}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export All ({exportFormat.toUpperCase()})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="cancellation" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
            <TabsTrigger value="terms">Terms of Service</TabsTrigger>
            <TabsTrigger value="rules">House Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="cancellation">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Cancellation Policy
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePrint('cancellation')}
                      variant="outline"
                      size="sm"
                      disabled={exporting}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button
                      onClick={() => handleExport('cancellation')}
                      size="sm"
                      disabled={exporting}
                    >
                      {exporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={cancellationPolicy}
                  onChange={(e) => setCancellationPolicy(e.target.value)}
                  rows={25}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Terms of Service
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePrint('terms')}
                      variant="outline"
                      size="sm"
                      disabled={exporting}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button
                      onClick={() => handleExport('terms')}
                      size="sm"
                      disabled={exporting}
                    >
                      {exporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={termsOfService}
                  onChange={(e) => setTermsOfService(e.target.value)}
                  rows={30}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    House Rules & Regulations
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePrint('rules')}
                      variant="outline"
                      size="sm"
                      disabled={exporting}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button
                      onClick={() => handleExport('rules')}
                      size="sm"
                      disabled={exporting}
                    >
                      {exporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={houseRules}
                  onChange={(e) => setHouseRules(e.target.value)}
                  rows={35}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Policies;
