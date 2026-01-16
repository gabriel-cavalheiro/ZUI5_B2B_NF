import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Token from "sap/m/Token";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ODataModel from "sap/ui/model/odata/ODataModel";
import UIComponent from "sap/ui/core/UIComponent";
import View from "sap/ui/core/mvc/View";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import MultiInput from "sap/m/MultiInput";
import VariantManagement$SelectEvent from "sap/ui/fl/variants/VariantManagement$SelectEvent";

interface IFiltros {
    dataInicio: Date | null;
    dataFim: Date | null;
    filiais: any[];
    cargaInicial: boolean;
}

interface IResultado {
    Status: string;
    Mensagem: string;
    QuantidadeProcessada: number;
    DataProcessamento: string | null;
}

interface IViewModel {
    filtros: IFiltros;
    resultadoVisivel: boolean;
    resultado: IResultado;
    carregando: boolean;
}

interface IVariant {
    key: string;
    name: string;
    content: IFiltros;
}

interface IVariantsModel {
    items: IVariant[];
    defaultKey: string;
    currentKey: string;
}

/**
 * @namespace br.com.inbetta.zui5b2bnf.controller
 */
export default class Main extends Controller {
    private _iLoadingTimeout: ReturnType<typeof setTimeout> | null = null;
    private _oValueHelpDialogBranch: any = null;

    public onInit(): void {
        const oViewModel = new JSONModel({
            filtros: {
                dataInicio: null,
                dataFim: null,
                filiais: [],
                cargaInicial: false
            },
            resultadoVisivel: false,
            resultado: {
                Status: "",
                Mensagem: "",
                QuantidadeProcessada: 0,
                DataProcessamento: null
            },
            carregando: false
        } as IViewModel);
        this.getView()?.setModel(oViewModel, "view");

        const oHelpModel = new JSONModel({
            filiais: []
        });
        this.getView()?.setModel(oHelpModel, "help");

        const oVariantsModel = new JSONModel({
            items: [],
            defaultKey: "",
            currentKey: ""
        } as IVariantsModel);
        this.getView()?.setModel(oVariantsModel, "variants");

        this._loadFiliais();
        this._loadVariants();
    }

    private _loadFiliais(): void {
        const oHelpModel = this.getView()?.getModel("help") as JSONModel;
        const oODataModel = this.getOwnerComponent()?.getModel() as ODataModel;

        if (!oODataModel) {
            console.error("ODataModel não encontrado");
            MessageBox.error("Erro ao carregar dados. ODataModel não disponível.");
            return;
        }

        oODataModel.read("/YpmtlBranchSet", {
            success: (oData: any) => {
                console.log("Filiais carregadas com sucesso:", oData);
                const aFiliais = oData.results.map((oItem: any) => ({
                    key: oItem.Branch,
                    text: oItem.Name
                }));
                oHelpModel.setProperty("/filiais", aFiliais);
            },
            error: (oError: any) => {
                console.error("Erro ao carregar filiais:", oError);
                MessageBox.error("Erro ao carregar a lista de filiais do backend.");
            }
        });
    }

    public onValueHelpRequestBranch(): void {
        if (!this._oValueHelpDialogBranch) {
            this._oValueHelpDialogBranch = sap.ui.xmlfragment(
                "br.com.inbetta.zui5b2bnf.view.ValueHelpBranch",
                this
            );
            this.getView()?.addDependent(this._oValueHelpDialogBranch);
        }
        this._oValueHelpDialogBranch.open();
    }

    public onValueHelpSearchBranch(oEvent: any): void {
        const sValue = oEvent.getParameter("value");
        const oFilter = new Filter("key", FilterOperator.Contains, sValue);
        oEvent.getSource().getBinding("items").filter([oFilter]);
    }

    public onValueHelpCloseBranch(oEvent: any): void {
        const oMultiInput = this.byId("multiInputBranch") as MultiInput;
        const aSelectedItems = oEvent.getParameter("selectedItems");
        const oViewModel = this.getView()?.getModel("view") as JSONModel;
        const aFiliais: any[] = [];

        if (oMultiInput) {
            oMultiInput.removeAllTokens();
        }

        if (aSelectedItems && aSelectedItems.length > 0) {
            aSelectedItems.forEach((oItem: any) => {
                const oContext = oItem.getBindingContext("help");
                const sKey = oContext.getProperty("key");
                const sText = oContext.getProperty("text");

                if (oMultiInput) {
                    oMultiInput.addToken(new Token({ key: sKey, text: sText }));
                }
                aFiliais.push({ key: sKey, text: sText });
            });
        }
        oViewModel.setProperty("/filtros/filiais", aFiliais);
    }

    private _formatDateToOData(oDate: Date): string {
        if (!oDate) return "";
        const sYear = oDate.getFullYear();
        const sMonth = ("0" + (oDate.getMonth() + 1)).slice(-2);
        const sDay = ("0" + oDate.getDate()).slice(-2);
        return sYear + sMonth + sDay + "000000";
    }

    private _getDefaultFiltros(): IFiltros {
        return {
            dataInicio: null,
            dataFim: null,
            filiais: [],
            cargaInicial: false
        };
    }

    private _getVariantStorageKey(): string {
        return "zui5b2bnf.variants";
    }

    private _loadVariants(): void {
        const oVariantsModel = this.getView()?.getModel("variants") as JSONModel;
        const oData: IVariantsModel = {
            items: [],
            defaultKey: "",
            currentKey: ""
        };

        try {
            const sRaw = window.localStorage.getItem(this._getVariantStorageKey());
            if (sRaw) {
                const oParsed = JSON.parse(sRaw);
                if (oParsed && typeof oParsed === "object") {
                    oData.items = Array.isArray(oParsed.items) ? oParsed.items : [];
                    oData.defaultKey = oParsed.defaultKey || "";
                    oData.currentKey = oParsed.currentKey || oParsed.defaultKey || "";
                }
            }
        } catch (e) {
            // Ignorar erros de storage
        }

        oVariantsModel.setData(oData);
        this._applyVariantByKey(oData.currentKey);
        this._setVariantSelection(oData.currentKey);
    }

    private _saveVariants(): void {
        const oVariantsModel = this.getView()?.getModel("variants") as JSONModel;
        if (!oVariantsModel) {
            return;
        }

        try {
            window.localStorage.setItem(
                this._getVariantStorageKey(),
                JSON.stringify(oVariantsModel.getData())
            );
        } catch (e) {
            // Ignorar erros de storage
        }
    }

    private _getVariantByKey(sKey: string): IVariant | null {
        const oVariantsModel = this.getView()?.getModel("variants") as JSONModel;
        if (!oVariantsModel || !sKey) {
            return null;
        }

        const aItems = (oVariantsModel.getProperty("/items") || []) as IVariant[];
        for (let i = 0; i < aItems.length; i++) {
            if (aItems[i].key === sKey) {
                return aItems[i];
            }
        }

        return null;
    }

    private _collectFiltersForVariant(): IFiltros {
        const oViewModel = this.getView()?.getModel("view") as JSONModel;
        const oFiltros = (oViewModel.getProperty("/filtros") || this._getDefaultFiltros()) as IFiltros;

        return {
            dataInicio: oFiltros.dataInicio ? new Date(oFiltros.dataInicio) : null,
            dataFim: oFiltros.dataFim ? new Date(oFiltros.dataFim) : null,
            filiais: Array.isArray(oFiltros.filiais) ? oFiltros.filiais : [],
            cargaInicial: !!oFiltros.cargaInicial
        };
    }

    private _normalizeFiltersFromVariant(oFilters: any): IFiltros {
        const oDefault = this._getDefaultFiltros();
        if (!oFilters || typeof oFilters !== "object") {
            return oDefault;
        }

        let oResult: IFiltros = {
            dataInicio: oDefault.dataInicio,
            dataFim: oDefault.dataFim,
            filiais: Array.isArray(oFilters.filiais) ? oFilters.filiais : [],
            cargaInicial: !!oFilters.cargaInicial
        };

        if (oFilters.dataInicio) {
            try {
                oResult.dataInicio = new Date(oFilters.dataInicio);
            } catch (e) {
                oResult.dataInicio = null;
            }
        }

        if (oFilters.dataFim) {
            try {
                oResult.dataFim = new Date(oFilters.dataFim);
            } catch (e) {
                oResult.dataFim = null;
            }
        }

        return oResult;
    }

    private _applyVariantByKey(sKey: string): void {
        if (!sKey) {
            return;
        }

        const oVariant = this._getVariantByKey(sKey);
        if (!oVariant || !oVariant.content) {
            return;
        }

        const oViewModel = this.getView()?.getModel("view") as JSONModel;
        const oNormalizedFilters = this._normalizeFiltersFromVariant(oVariant.content);
        oViewModel.setProperty("/filtros", oNormalizedFilters);
    }

    private _setVariantSelection(sKey: string): void {
        const oVariantManagement = this.byId("vmFiltros") as any;
        if (oVariantManagement && oVariantManagement.setSelectedKey) {
            oVariantManagement.setSelectedKey(sKey);
        }
    }

    public onVariantSelect(oEvent: VariantManagement$SelectEvent): void {
        const sKey = oEvent.getParameter("key");
        const oVariantsModel = this.getView()?.getModel("variants") as JSONModel;
        oVariantsModel.setProperty("/currentKey", sKey);
        this._applyVariantByKey(sKey);
    }

    public onVariantSave(oEvent: any): void {
        const oVariantsModel = this.getView()?.getModel("variants") as JSONModel;
        const aItems = (oVariantsModel.getProperty("/items") || []) as IVariant[];
        const sName = oEvent.getParameter("name");
        const bOverwrite = oEvent.getParameter("overwrite");
        const sKey = oEvent.getParameter("key");
        const bDefault = oEvent.getParameter("def");
        const oVariantManagement = this.byId("vmFiltros") as any;

        const oContent = this._collectFiltersForVariant();
        let oVariant: IVariant | null = null;

        if (bOverwrite && sKey) {
            oVariant = this._getVariantByKey(sKey);
        }

        if (oVariant) {
            oVariant.name = sName;
            oVariant.content = oContent;
        } else {
            const newKey = "VAR_" + Date.now();
            oVariant = {
                key: newKey,
                name: sName,
                content: oContent
            };
            aItems.push(oVariant);
        }

        if (bDefault) {
            oVariantsModel.setProperty("/defaultKey", sKey);
        }

        oVariantsModel.setProperty("/items", aItems);
        oVariantsModel.setProperty("/currentKey", sKey);
        this._setVariantSelection(sKey);
        this._saveVariants();

        if (oVariantManagement && oVariantManagement.currentVariantSetModified) {
            oVariantManagement.currentVariantSetModified(false);
        }
    }

    public onVariantManage(oEvent: any): void {
        const oVariantsModel = this.getView()?.getModel("variants") as JSONModel;
        let aItems = (oVariantsModel.getProperty("/items") || []) as IVariant[];
        const aRenamed = oEvent.getParameter("renamed") || [];
        const aDeleted = oEvent.getParameter("deleted") || [];
        let sDefaultKey = oEvent.getParameter("def") || "";
        let sCurrentKey = (oVariantsModel.getProperty("/currentKey") || "") as string;

        aRenamed.forEach((oRename: any) => {
            for (let i = 0; i < aItems.length; i++) {
                if (aItems[i].key === oRename.key) {
                    aItems[i].name = oRename.name;
                    break;
                }
            }
        });

        if (aDeleted.length > 0) {
            aItems = aItems.filter((oItem) => aDeleted.indexOf(oItem.key) === -1);
        }

        if (aDeleted.indexOf(sCurrentKey) !== -1) {
            sCurrentKey = sDefaultKey || "";
            this._applyVariantByKey(sCurrentKey);
            this._setVariantSelection(sCurrentKey);
        }

        if (sDefaultKey && aItems.every((oItem) => oItem.key !== sDefaultKey)) {
            sDefaultKey = "";
        }

        oVariantsModel.setProperty("/items", aItems);
        oVariantsModel.setProperty("/defaultKey", sDefaultKey);
        oVariantsModel.setProperty("/currentKey", sCurrentKey);
        this._saveVariants();
    }

    public onProcessar(): void {
        const oView = this.getView();
        const oViewModel = oView?.getModel("view") as JSONModel;
        const oI18nModel = this.getView()?.getModel("i18n") as ResourceModel;
        const oResourceBundle = oI18nModel?.getResourceBundle() as ResourceBundle;
        const oFiltros = (oViewModel.getProperty("/filtros") || this._getDefaultFiltros()) as IFiltros;

        const bTemDataInicio = oFiltros.dataInicio !== null && oFiltros.dataInicio !== undefined;
        const bTemDataFim = oFiltros.dataFim !== null && oFiltros.dataFim !== undefined;

        // Validação: pelo menos um filtro deve ser preenchido
        if (!bTemDataInicio) {
            const sMsg = oResourceBundle?.getText("msgValidacao") || "Por favor, preencha pelo menos um filtro para processar.";
            MessageBox.warning(sMsg);
            return;
        }

        // Validação: se tem data início, deve ter data fim
        if (bTemDataInicio && !bTemDataFim) {
            MessageBox.warning("Por favor, preencha a data final ou deixe ambas em branco.");
            return;
        }

        // Validação: se tem data fim, deve ter data início
        if (!bTemDataInicio && bTemDataFim) {
            MessageBox.warning("Por favor, preencha a data inicial ou deixe ambas em branco.");
            return;
        }

        // Validação: data início não pode ser maior que data fim
        if (bTemDataInicio && bTemDataFim && oFiltros.dataInicio! > oFiltros.dataFim!) {
            MessageBox.error("A data inicial não pode ser maior que a data final.");
            return;
        }

        const oPayload = {
            DataInicio: bTemDataInicio ? this._formatDateToOData(oFiltros.dataInicio!) : "",
            DataFim: bTemDataFim ? this._formatDateToOData(oFiltros.dataFim!) : "",
            Branch: oFiltros.filiais.map((f: any) => f.key).join(","),
            CargaInicial: oFiltros.cargaInicial ? "true" : "false"
        };

        this._showLoading();
        this._callFunctionImport(oPayload);
    }

    private _showLoading(): void {
        const oViewModel = this.getView()?.getModel("view") as JSONModel;
        oViewModel.setProperty("/carregando", true);

        if (this._iLoadingTimeout) {
            clearTimeout(this._iLoadingTimeout);
        }

        BusyIndicator.show(0);

        this._iLoadingTimeout = setTimeout(() => {
            console.warn("Timeout: Fechando loading após 30 segundos");
            this._hideLoading();
            MessageBox.error("Timeout: A requisição demorou muito tempo. Por favor, tente novamente.");
        }, 30000);

        this._disableButtons(true);
    }

    private _hideLoading(): void {
        const oViewModel = this.getView()?.getModel("view") as JSONModel;
        oViewModel.setProperty("/carregando", false);

        if (this._iLoadingTimeout) {
            clearTimeout(this._iLoadingTimeout);
            this._iLoadingTimeout = null;
        }

        BusyIndicator.hide();
        this._disableButtons(false);
    }

    private _disableButtons(bDisable: boolean): void {
        const oView = this.getView();
        const oProcessarBtn = oView?.byId("btnProcessar") as any;
        const oLimparBtn = oView?.byId("btnLimpar") as any;

        if (oProcessarBtn) {
            oProcessarBtn.setEnabled(!bDisable);
        }
        if (oLimparBtn) {
            oLimparBtn.setEnabled(!bDisable);
        }
    }

    private _callFunctionImport(oPayload: any): void {
        const oODataModel = this.getOwnerComponent()?.getModel() as ODataModel;
        const oViewModel = this.getView()?.getModel("view") as JSONModel;
        const oI18nModel = this.getView()?.getModel("i18n") as ResourceModel;
        const oResourceBundle = oI18nModel?.getResourceBundle() as ResourceBundle;

        const oRequestOptions = {
            success: (oData: any, oResponse: any) => {
                console.log("Sucesso na requisição, ocultando loading...");

                this._hideLoading();

                const iStatusCode = oResponse.statusCode;
                const sDataProcessamento = this._getDataProcessamentoFromResponse(oData, oResponse);

                const oResult: IResultado = {
                    Status: oData.Status,
                    Mensagem: oData.Mensagem,
                    QuantidadeProcessada: parseInt(oData.QuantidadeProcessada) || 0,
                    DataProcessamento: sDataProcessamento
                };

                oViewModel.setProperty("/resultado", oResult);
                oViewModel.setProperty("/resultadoVisivel", true);

                if (iStatusCode === 201 && oData.Status === "Sucesso") {
                    const sMsg = oResourceBundle?.getText("msgSucesso") || "Processamento concluído com sucesso!";
                    MessageToast.show(sMsg);
                } else if (iStatusCode === 204 || oData.Status === "Aviso") {
                    MessageBox.warning(oData.Mensagem);
                } else {
                    MessageBox.error(oData.Mensagem);
                }
            },
            error: (oError: any) => {
                console.log("Erro na requisição, ocultando loading...");

                this._hideLoading();

                let sErrorMessage = oResourceBundle?.getText("msgErro") || "Erro ao processar. Tente novamente.";
                try {
                    const oErrorResponse = JSON.parse(oError.responseText);
                    sErrorMessage = oErrorResponse.error.message.value;
                } catch (e) {
                    if (oError.statusCode === 0) {
                        sErrorMessage = "Erro de conexão. Verifique sua conexão com o servidor.";
                    }
                }

                MessageBox.error(sErrorMessage);
                oViewModel.setProperty("/resultadoVisivel", false);
            }
        };

        oODataModel.create("/ProcessarNotasSet", oPayload, oRequestOptions);
    }

    private _getDataProcessamentoFromResponse(oData: any, oResponse: any): string {
        if (oData && oData.DataProcessamento) {
            return oData.DataProcessamento;
        }
        return new Date().toLocaleString("pt-BR");
    }

    public onLimpar(): void {
        const oView = this.getView();
        const oViewModel = oView?.getModel("view") as JSONModel;
        const oMultiInput = this.byId("multiInputBranch") as MultiInput;

        if (oMultiInput) {
            oMultiInput.removeAllTokens();
        }

        oViewModel.setData({
            filtros: {
                dataInicio: null,
                dataFim: null,
                filiais: [],
                cargaInicial: false
            },
            resultadoVisivel: false,
            resultado: {
                Status: "",
                Mensagem: "",
                QuantidadeProcessada: 0,
                DataProcessamento: null
            },
            carregando: false
        } as IViewModel);

        const oI18nModel = this.getView()?.getModel("i18n") as ResourceModel;
        const oResourceBundle = oI18nModel?.getResourceBundle() as ResourceBundle;
        const sMsg = oResourceBundle?.getText("msgFiltrosLimpos") || "Filtros limpos com sucesso!";
        MessageToast.show(sMsg);
    }

    public onExportarResultado(): void {
        const oViewModel = this.getView()?.getModel("view") as JSONModel;
        const oResultado = oViewModel.getProperty("/resultado") as IResultado;

        if (!oResultado || !oResultado.Status) {
            MessageBox.warning("Nenhum resultado para exportar.");
            return;
        }

        const aColunas = [
            { label: "Status", property: "Status" },
            { label: "Mensagem", property: "Mensagem" },
            { label: "Registros Processados", property: "QuantidadeProcessada" },
            { label: "Data/Hora", property: "DataProcessamento" }
        ];

        const aData = [oResultado];

        const oSettings = {
            workbook: {
                columns: aColunas
            },
            dataSource: aData,
            fileName: "resultado_processamento.xlsx"
        };

        // Importar Spreadsheet dinamicamente
        sap.ui.require(["sap/ui/export/Spreadsheet"], (Spreadsheet: any) => {
            new Spreadsheet(oSettings).build().then(() => {
                MessageToast.show("Arquivo exportado com sucesso!");
            });
        });
    }
}