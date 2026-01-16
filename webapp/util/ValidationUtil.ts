/**
 * Utilitários para validação de dados
 * @namespace br.com.inbetta.zui5b2bnf.util
 */

import { IFiltros, IValidationError, ValidationErrorType } from "../model/Types";
import { DateUtil } from "./DateUtil";

/**
 * Classe com funções estáticas para validação
 */
export class ValidationUtil {
    /**
     * Valida se o período foi preenchido
     * @param oFiltros - Filtros a validar
     * @returns Array de erros de validação (vazio se válido)
     * @example
     * ValidationUtil.validatePeriod(oFiltros)
     * // Retorna: [] ou [{ type: "PERIOD_REQUIRED", message: "..." }]
     */
    public static validatePeriod(oFiltros: IFiltros): IValidationError[] {
        const aErrors: IValidationError[] = [];

        const bTemDataInicio = oFiltros.dataInicio !== null && oFiltros.dataInicio !== undefined;
        const bTemDataFim = oFiltros.dataFim !== null && oFiltros.dataFim !== undefined;

        // Validação: pelo menos período deve ser preenchido
        if (!bTemDataInicio && !bTemDataFim) {
            aErrors.push({
                type: ValidationErrorType.PERIOD_REQUIRED,
                message: "Por favor, preencha o período para processar."
            });
            return aErrors;
        }

        // Validação: se tem data início, deve ter data fim
        if (bTemDataInicio && !bTemDataFim) {
            aErrors.push({
                type: ValidationErrorType.DATE_RANGE_INVALID,
                message: "Por favor, preencha a data final."
            });
            return aErrors;
        }

        // Validação: se tem data fim, deve ter data início
        if (!bTemDataInicio && bTemDataFim) {
            aErrors.push({
                type: ValidationErrorType.DATE_RANGE_INVALID,
                message: "Por favor, preencha a data inicial."
            });
            return aErrors;
        }

        return aErrors;
    }

    /**
     * Valida a ordem das datas (início não pode ser maior que fim)
     * @param oFiltros - Filtros a validar
     * @returns Array de erros de validação (vazio se válido)
     * @example
     * ValidationUtil.validateDateOrder(oFiltros)
     * // Retorna: [] ou [{ type: "START_DATE_AFTER_END_DATE", message: "..." }]
     */
    public static validateDateOrder(oFiltros: IFiltros): IValidationError[] {
        const aErrors: IValidationError[] = [];

        if (!oFiltros.dataInicio || !oFiltros.dataFim) {
            return aErrors;
        }

        if (!DateUtil.isValidDate(oFiltros.dataInicio) || !DateUtil.isValidDate(oFiltros.dataFim)) {
            aErrors.push({
                type: ValidationErrorType.INVALID_DATE,
                message: "Datas inválidas."
            });
            return aErrors;
        }

        if (oFiltros.dataInicio > oFiltros.dataFim) {
            aErrors.push({
                type: ValidationErrorType.START_DATE_AFTER_END_DATE,
                message: "A data inicial não pode ser maior que a data final."
            });
        }

        return aErrors;
    }

    /**
     * Valida todos os filtros
     * @param oFiltros - Filtros a validar
     * @returns Array de erros de validação (vazio se válido)
     * @example
     * ValidationUtil.validateFilters(oFiltros)
     * // Retorna: [] ou [{ type: "...", message: "..." }, ...]
     */
    public static validateFilters(oFiltros: IFiltros): IValidationError[] {
        const aErrors: IValidationError[] = [];

        // Validar período
        const aPeriodErrors = this.validatePeriod(oFiltros);
        aErrors.push(...aPeriodErrors);

        // Se houver erro de período, não continuar validando
        if (aPeriodErrors.length > 0) {
            return aErrors;
        }

        // Validar ordem das datas
        const aDateOrderErrors = this.validateDateOrder(oFiltros);
        aErrors.push(...aDateOrderErrors);

        return aErrors;
    }

    /**
     * Verifica se um filtro é válido
     * @param oFiltros - Filtros a validar
     * @returns true se válido, false caso contrário
     * @example
     * ValidationUtil.isValid(oFiltros)
     * // Retorna: true ou false
     */
    public static isValid(oFiltros: IFiltros): boolean {
        const aErrors = this.validateFilters(oFiltros);
        return aErrors.length === 0;
    }

    /**
     * Valida se uma string é uma data válida no formato OData
     * @param sDate - String de data no formato OData (YYYYMMDDHHmmss)
     * @returns true se válida, false caso contrário
     * @example
     * ValidationUtil.isValidODataDate("20250115143045")
     * // Retorna: true
     */
    public static isValidODataDate(sDate: string): boolean {
        if (!sDate || sDate.length < 8) {
            return false;
        }

        const oDate = DateUtil.parseODataDate(sDate);
        return oDate !== null && DateUtil.isValidDate(oDate);
    }

    /**
     * Valida se um array de filiais não está vazio
     * @param aFiliais - Array de filiais
     * @returns true se tem pelo menos uma filial, false caso contrário
     * @example
     * ValidationUtil.hasFiliais([{ key: "0001", text: "Filial SP" }])
     * // Retorna: true
     */
    public static hasFiliais(aFiliais: any[]): boolean {
        return Array.isArray(aFiliais) && aFiliais.length > 0;
    }

    /**
     * Valida se uma string não está vazia
     * @param sValue - String a validar
     * @returns true se não vazia, false caso contrário
     * @example
     * ValidationUtil.isNotEmpty("valor")
     * // Retorna: true
     */
public static isNotEmpty(sValue: string): boolean {
    return !!(sValue && sValue.trim().length > 0);
}

    /**
     * Valida se um valor é um número
     * @param value - Valor a validar
     * @returns true se é número, false caso contrário
     * @example
     * ValidationUtil.isNumber(123)
     * // Retorna: true
     */
    public static isNumber(value: any): boolean {
        return !isNaN(value) && isFinite(value);
    }

    /**
     * Valida se um email é válido
     * @param sEmail - Email a validar
     * @returns true se válido, false caso contrário
     * @example
     * ValidationUtil.isValidEmail("user@example.com")
     * // Retorna: true
     */
    public static isValidEmail(sEmail: string): boolean {
        const sPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return sPattern.test(sEmail);
    }

    /**
     * Obtém a primeira mensagem de erro
     * @param aErrors - Array de erros
     * @returns Mensagem do primeiro erro ou string vazia
     * @example
     * ValidationUtil.getFirstErrorMessage(aErrors)
     * // Retorna: "Por favor, preencha o período para processar."
     */
    public static getFirstErrorMessage(aErrors: IValidationError[]): string {
        if (aErrors && aErrors.length > 0) {
            return aErrors[0].message;
        }
        return "";
    }

    /**
     * Obtém todas as mensagens de erro
     * @param aErrors - Array de erros
     * @returns Array de mensagens
     * @example
     * ValidationUtil.getAllErrorMessages(aErrors)
     * // Retorna: ["Erro 1", "Erro 2"]
     */
    public static getAllErrorMessages(aErrors: IValidationError[]): string[] {
        return aErrors.map(oError => oError.message);
    }
}