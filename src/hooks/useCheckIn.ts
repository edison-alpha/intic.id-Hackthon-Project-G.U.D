/**
 * Check-In Hooks
 * React hooks for ticket check-in functionality
 */

import { useState, useCallback } from 'react';
import { checkInService, type CheckInResult, type TicketValidationResult, type CheckInData } from '@/services/checkInService';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for ticket validation
 */
export function useTicketValidation() {
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<TicketValidationResult | null>(null);
  const { toast } = useToast();

  const validateTicket = useCallback(async (contractAddress: string, tokenId: number) => {
    setLoading(true);
    try {
      const result = await checkInService.validateTicket(contractAddress, tokenId);
      setValidationResult(result);

      // Show toast based on validation result
      if (result.canCheckIn) {
        toast({
          title: "Ticket Valid",
          description: "Ready for check-in",
          variant: "default"
        });
      } else {
        toast({
          title: "Validation Failed",
          description: result.message,
          variant: "destructive"
        });
      }

      return result;
    } catch (error: any) {
      const errorMsg = error.message || 'Validation failed';
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  return {
    validateTicket,
    validationResult,
    loading,
    clearValidation
  };
}

/**
 * Hook for ticket check-in
 */
export function useTicketCheckIn() {
  const [loading, setLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const { toast } = useToast();

  const checkInTicket = useCallback(async (contractAddress: string, tokenId: number) => {
    setLoading(true);
    try {
      const result = await checkInService.checkInTicket(contractAddress, tokenId);
      setCheckInResult(result);

      if (result.success) {
        toast({
          title: "Check-in Successful",
          description: `Transaction: ${result.txHash?.substring(0, 10)}...`,
          variant: "default"
        });
      } else {
        toast({
          title: "Check-in Failed",
          description: result.message,
          variant: "destructive"
        });
      }

      return result;
    } catch (error: any) {
      const errorMsg = error.message || 'Check-in failed';
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const clearCheckInResult = useCallback(() => {
    setCheckInResult(null);
  }, []);

  return {
    checkInTicket,
    checkInResult,
    loading,
    clearCheckInResult
  };
}

/**
 * Hook for QR code parsing
 */
export function useQRParser() {
  const parseCheckInQR = useCallback((qrData: string): CheckInData | null => {
    return checkInService.parseCheckInQR(qrData);
  }, []);

  const generateCheckInQR = useCallback((
    contractAddress: string, 
    tokenId: number, 
    eventDate: string, 
    eventTime: string
  ): string => {
    return checkInService.generateCheckInQR(contractAddress, tokenId, eventDate, eventTime);
  }, []);

  return {
    parseCheckInQR,
    generateCheckInQR
  };
}

/**
 * Hook for ticket information
 */
export function useTicketInfo() {
  const [loading, setLoading] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<any>(null);
  const { toast } = useToast();

  const getTicketInfo = useCallback(async (contractAddress: string, tokenId: number) => {
    setLoading(true);
    try {
      const info = await checkInService.getTicketInfo(contractAddress, tokenId);
      setTicketInfo(info);
      return info;
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to get ticket info';
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const clearTicketInfo = useCallback(() => {
    setTicketInfo(null);
  }, []);

  return {
    getTicketInfo,
    ticketInfo,
    loading,
    clearTicketInfo
  };
}

/**
 * Combined hook for complete check-in workflow
 */
export function useCheckInWorkflow() {
  const validation = useTicketValidation();
  const checkIn = useTicketCheckIn();
  const qrParser = useQRParser();
  const ticketInfo = useTicketInfo();

  const [currentStep, setCurrentStep] = useState<'scan' | 'validate' | 'confirm' | 'complete'>('scan');
  const [checkInData, setCheckInData] = useState<CheckInData | null>(null);

  const processQRCode = useCallback(async (qrData: string) => {
    // Parse QR code
    const parsedData = qrParser.parseCheckInQR(qrData);
    if (!parsedData) {
      throw new Error('Invalid QR code format');
    }

    setCheckInData(parsedData);
    setCurrentStep('validate');

    // Validate ticket
    const validationResult = await validation.validateTicket(
      parsedData.contractAddress, 
      parsedData.tokenId
    );

    if (validationResult.canCheckIn) {
      setCurrentStep('confirm');
    }

    return validationResult;
  }, [qrParser, validation]);

  const confirmCheckIn = useCallback(async () => {
    if (!checkInData || !validation.validationResult?.canCheckIn) {
      throw new Error('Cannot proceed with check-in');
    }

    setCurrentStep('complete');
    
    const result = await checkIn.checkInTicket(
      checkInData.contractAddress, 
      checkInData.tokenId
    );

    return result;
  }, [checkInData, validation.validationResult, checkIn]);

  const resetWorkflow = useCallback(() => {
    setCurrentStep('scan');
    setCheckInData(null);
    validation.clearValidation();
    checkIn.clearCheckInResult();
    ticketInfo.clearTicketInfo();
  }, [validation, checkIn, ticketInfo]);

  return {
    // State
    currentStep,
    checkInData,
    
    // Actions
    processQRCode,
    confirmCheckIn,
    resetWorkflow,
    
    // Sub-hooks
    validation,
    checkIn,
    qrParser,
    ticketInfo,
    
    // Loading states
    loading: validation.loading || checkIn.loading || ticketInfo.loading
  };
}