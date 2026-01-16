
/**
 * Utilitários para formatação e manipulação de datas
 * @namespace br.com.inbetta.zui5b2bnf.util
 */

/**
 * Classe com funções estáticas para manipulação de datas
 */
export class DateUtil {
    /**
     * Formata uma data para o formato OData (YYYYMMDDHHmmss)
     * @param oDate - Data a ser formatada
     * @returns String formatada no padrão OData
     * @example
     * DateUtil.formatDateToOData(new Date(2025, 0, 15))
     * // Retorna: "20250115000000"
     */
    public static formatDateToOData(oDate: Date): string {
        if (!oDate) {
            return "";
        }

        const sYear = oDate.getFullYear();
        const sMonth = ("0" + (oDate.getMonth() + 1)).slice(-2);
        const sDay = ("0" + oDate.getDate()).slice(-2);
        const sHour = ("0" + oDate.getHours()).slice(-2);
        const sMinute = ("0" + oDate.getMinutes()).slice(-2);
        const sSecond = ("0" + oDate.getSeconds()).slice(-2);

        return `${sYear}${sMonth}${sDay}${sHour}${sMinute}${sSecond}`;
    }

    /**
     * Formata uma data para o formato brasileiro (dd/MM/yyyy)
     * @param oDate - Data a ser formatada
     * @returns String formatada no padrão brasileiro
     * @example
     * DateUtil.formatDateToBR(new Date(2025, 0, 15))
     * // Retorna: "15/01/2025"
     */
    public static formatDateToBR(oDate: Date): string {
        if (!oDate) {
            return "";
        }

        const sDay = ("0" + oDate.getDate()).slice(-2);
        const sMonth = ("0" + (oDate.getMonth() + 1)).slice(-2);
        const sYear = oDate.getFullYear();

        return `${sDay}/${sMonth}/${sYear}`;
    }

    /**
     * Formata uma data com hora para o padrão brasileiro (dd/MM/yyyy HH:mm:ss)
     * @param oDate - Data a ser formatada
     * @returns String formatada com data e hora
     * @example
     * DateUtil.formatDateTimeToBR(new Date(2025, 0, 15, 14, 30, 45))
     * // Retorna: "15/01/2025 14:30:45"
     */
    public static formatDateTimeToBR(oDate: Date): string {
        if (!oDate) {
            return "";
        }

        const sDate = this.formatDateToBR(oDate);
        const sHour = ("0" + oDate.getHours()).slice(-2);
        const sMinute = ("0" + oDate.getMinutes()).slice(-2);
        const sSecond = ("0" + oDate.getSeconds()).slice(-2);

        return `${sDate} ${sHour}:${sMinute}:${sSecond}`;
    }

    /**
     * Converte uma string OData para Date
     * @param sODataDate - String no formato OData (YYYYMMDDHHmmss)
     * @returns Objeto Date
     * @example
     * DateUtil.parseODataDate("20250115143045")
     * // Retorna: Date(2025, 0, 15, 14, 30, 45)
     */
    public static parseODataDate(sODataDate: string): Date | null {
        if (!sODataDate || sODataDate.length < 8) {
            return null;
        }

        try {
            const sYear = sODataDate.substring(0, 4);
            const sMonth = sODataDate.substring(4, 6);
            const sDay = sODataDate.substring(6, 8);
            const sHour = sODataDate.substring(8, 10) || "00";
            const sMinute = sODataDate.substring(10, 12) || "00";
            const sSecond = sODataDate.substring(12, 14) || "00";

            return new Date(
                parseInt(sYear),
                parseInt(sMonth) - 1,
                parseInt(sDay),
                parseInt(sHour),
                parseInt(sMinute),
                parseInt(sSecond)
            );
        } catch (e) {
            console.error("Erro ao fazer parse de data OData:", e);
            return null;
        }
    }

    /**
     * Verifica se uma data é válida
     * @param oDate - Data a ser validada
     * @returns true se a data é válida, false caso contrário
     * @example
     * DateUtil.isValidDate(new Date(2025, 0, 15))
     * // Retorna: true
     */
    public static isValidDate(oDate: any): boolean {
        if (!(oDate instanceof Date)) {
            return false;
        }
        return !isNaN(oDate.getTime());
    }

    /**
     * Retorna a diferença em dias entre duas datas
     * @param oDate1 - Primeira data
     * @param oDate2 - Segunda data
     * @returns Número de dias de diferença
     * @example
     * DateUtil.getDaysDifference(new Date(2025, 0, 15), new Date(2025, 0, 20))
     * // Retorna: 5
     */
    public static getDaysDifference(oDate1: Date, oDate2: Date): number {
        if (!this.isValidDate(oDate1) || !this.isValidDate(oDate2)) {
            return 0;
        }

        const iTime = Math.abs(oDate2.getTime() - oDate1.getTime());
        const iDays = Math.ceil(iTime / (1000 * 60 * 60 * 24));

        return iDays;
    }

    /**
     * Adiciona dias a uma data
     * @param oDate - Data base
     * @param iDays - Número de dias a adicionar
     * @returns Nova data com dias adicionados
     * @example
     * DateUtil.addDays(new Date(2025, 0, 15), 5)
     * // Retorna: Date(2025, 0, 20)
     */
    public static addDays(oDate: Date, iDays: number): Date {
        const oNewDate = new Date(oDate);
        oNewDate.setDate(oNewDate.getDate() + iDays);
        return oNewDate;
    }

    /**
     * Retorna o início do dia (00:00:00)
     * @param oDate - Data
     * @returns Nova data com hora zerada
     * @example
     * DateUtil.getStartOfDay(new Date(2025, 0, 15, 14, 30, 45))
     * // Retorna: Date(2025, 0, 15, 0, 0, 0)
     */
    public static getStartOfDay(oDate: Date): Date {
        const oNewDate = new Date(oDate);
        oNewDate.setHours(0, 0, 0, 0);
        return oNewDate;
    }

    /**
     * Retorna o fim do dia (23:59:59)
     * @param oDate - Data
     * @returns Nova data com hora no fim do dia
     * @example
     * DateUtil.getEndOfDay(new Date(2025, 0, 15, 14, 30, 45))
     * // Retorna: Date(2025, 0, 15, 23, 59, 59)
     */
    public static getEndOfDay(oDate: Date): Date {
        const oNewDate = new Date(oDate);
        oNewDate.setHours(23, 59, 59, 999);
        return oNewDate;
    }

    /**
     * Verifica se uma data é hoje
     * @param oDate - Data a verificar
     * @returns true se é hoje, false caso contrário
     */
    public static isToday(oDate: Date): boolean {
        const oToday = new Date();
        return (
            oDate.getDate() === oToday.getDate() &&
            oDate.getMonth() === oToday.getMonth() &&
            oDate.getFullYear() === oToday.getFullYear()
        );
    }

    /**
     * Verifica se uma data é no passado
     * @param oDate - Data a verificar
     * @returns true se é no passado, false caso contrário
     */
    public static isPast(oDate: Date): boolean {
        return oDate < new Date();
    }

    /**
     * Verifica se uma data é no futuro
     * @param oDate - Data a verificar
     * @returns true se é no futuro, false caso contrário
     */
    public static isFuture(oDate: Date): boolean {
        return oDate > new Date();
    }
}