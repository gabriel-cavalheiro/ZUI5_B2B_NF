/**
 * Controller Principal - Refatorado com Arquitetura Modular
 * @namespace br.com.inbetta.zui5b2bnf.controller
 */

import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import Token from "sap/m/Token";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ODataModel from "sap/ui/model/odata/ODataModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import MultiInput from "sap/m/MultiInput";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";

// Imports de Services
import { VariantService } from "../service/VariantService";
import { ODataService } from "../service/ODataService";
import { FilterService } from "../service/FilterService";

// Imports de Utilities
import { ValidationUtil } from "../util/ValidationUtil";

// Imports de Types
import { IFiltros, IViewModel, IVariantsModel, IResultado } from "../model/Types";

/**
 * Controller Principal - Orquestrador de operações
 * Responsabilidades:
 * - Coordenar ações do usuário
 * - Delegar lógica para services
 * - Gerenciar UI e eventos
 */
export default class Main extends Controller {
    // Services
    private _variantService: VariantService | null = null;
    private _oDataService: ODataService | null = null;
    private _filterService: FilterService | null = null;

    // Propriedades privadas
    private _iLoadingTimeout: ReturnType<typeof setTimeout> | null = null;
    private _oValueHelpDialogBranch: any = null;

    /**
     * Inicialização do controller
     */
    public onInit(): void {
        // Inicializar modelos
        this._initializeModels();

        // Inicializar services
        this._initializeServices();

        // Carregar dados iniciais
        this._loadInitialData();
    }

    /**
     * Inicializa os modelos de dados
     */
    private _initializeModels(): void {
        // Modelo de view (filtros e resultados)
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

        // Modelo de help (ValueHelp)
        const oHelpModel = new JSONModel({
            filiais: []
        });
        this.getView()?.setModel(oHelpModel, "help");

        // Modelo de variantes
        const oVariantsModel = new JSONModel({
            items: [],
            defaultKey: "",
            currentKey: ""
        } as IVariantsModel);
        this.getView()?.setModel(oVariantsModel, "variants");
    }

    /**
     * Inicializa os services
     */
    private _initializeServices(): void {
        const oODataModel = this.getOwnerComponent()?.getModel() as ODataModel;
        const oHelpModel = this.getView()?.getModel("help") as JSONModel;
        const oVariantsModel = this.getView()?.getModel("variants") as JSONModel;

        this._oDataService = new ODataService(oODataModel, oHelpModel);
        this._variantService = new VariantService(oVariantsModel);
        this._filterService = new FilterService();
    }

    /**
     * Carrega dados iniciais
     */
    private _loadInitialData(): void {
        // Carregar filiais
        this._oDataService?.loadFiliais().catch((oError) => {
            console.error("Erro ao carregar filiais:", oError);
        });

        // Carregar variantes
        if (this._variantService) {
            this._variantService.loadVariants();
            const oData = this._variantService.loadVariants();
            if (oData.currentKey) {
                const oFiltros = this._variantService.applyVariantByKey(oData.currentKey);
                if (oFiltros) {
                    const oViewModel = this.getView()?.getModel("view") as JSONModel;
                    oViewModel.setProperty("/filtros", oFiltros);
                }
            }
        }
    }

    // ========== HANDLERS DE EVENTOS ==========

    /**
     * Handler para botão Processar
     */
    public onProcessar(): void {
        const oViewModel = this.getView()?.getModel("view") as JSONModel;
        const oFiltros = oViewModel.getProperty("/filtros") as IFiltros;

        // Validar filtros
        const aErrors = this._filterService!.validateFilters(oFiltros);
        if (aErrors.length > 0) {
            const sMsg = ValidationUtil.getFirstErrorMessage(aErrors);
            MessageBox.warning(sMsg);
            return;
        }

        // Criar payload
        let oPayload;
        try {
            oPayload = this._filterService!.createPayload(oFiltros);
        } catch (e) {
            MessageBox.error((e as Error).message);
            return;
        }

        // Processar
        this._showLoading();
        this._callFunctionImport(oPayload);
    }

    /**
     * Handler para botão Limpar
     */
    public onLimpar(): void {
        const oView = this.getView();
        const oViewModel = oView?.getModel("view") as JSONModel;
        const oMultiInput = this.byId("multiInputBranch") as MultiInput;

        // Limpar tokens
        if (oMultiInput) {
            oMultiInput.removeAllTokens();
        }

        // Limpar filtros
        oViewModel.setData({
            filtros: this._filterService!.getDefaultFilters(),
            resultadoVisivel: false,
            resultado: {
                Status: "",
                Mensagem: "",
                QuantidadeProcessada: 0,
                DataProcessamento: null
            },
            carregando: false
        } as IViewModel);

        // Mensagem
        const oResourceBundle = this._getResourceBundle();
        const sMsg = oResourceBundle?.getText("msgFiltrosLimpos") || "Filtros limpos com sucesso!";
        MessageToast.show(sMsg);
    }

    /**
     * Handler para exportar resultado
     */
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

        sap.ui.require(["sap/ui/export/Spreadsheet"], (Spreadsheet: any) => {
            new Spreadsheet(oSettings).build().then(() => {
                MessageToast.show("Arquivo exportado com sucesso!");
            });
        });
    }

    // ========== HANDLERS DE VARIANTES ==========

    /**
     * Handler para seleção de variante
     */
    public onVariantSelect(oEvent: any): void {
        const sKey = oEvent.getParameter("key");
        const oFiltros = this._variantService!.applyVariantByKey(sKey);

        if (oFiltros) {
            const oViewModel = this.getView()?.getModel("view") as JSONModel;
            oViewModel.setProperty("/filtros", oFiltros);
        }

        this._variantService!.setVariantSelection(sKey);
    }

    /**
     * Handler para salvar variante
     */
    public onVariantSave(oEvent: any): void {
        const sName = oEvent.getParameter("name");
        const bOverwrite = oEvent.getParameter("overwrite");
        const sKey = oEvent.getParameter("key");
        const bDefault = oEvent.getParameter("def");

        const oViewModel = this.getView()?.getModel("view") as JSONModel;
        const oFiltros = oViewModel.getProperty("/filtros") as IFiltros;
        const oContent = this._filterService!.cloneFilters(oFiltros);

        this._variantService!.saveVariant(sName, bOverwrite, sKey, bDefault, oContent);

        const oVariantManagement = this.byId("vmFiltros") as any;
        if (oVariantManagement && oVariantManagement.currentVariantSetModified) {
            oVariantManagement.currentVariantSetModified(false);
        }
    }

    /**
     * Handler para gerenciar variantes
     */
    public onVariantManage(oEvent: any): void {
        const aRenamed = oEvent.getParameter("renamed") || [];
        const aDeleted = oEvent.getParameter("deleted") || [];
        const sDefaultKey = oEvent.getParameter("def") || "";

        this._variantService!.manageVariants(aRenamed, aDeleted, sDefaultKey);
    }

    // ========== HANDLERS DE VALUE HELP ==========

    /**
     * Handler para abrir ValueHelp de Filial
     */
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

    /**
     * Handler para buscar em ValueHelp de Filial
     */
    public onValueHelpSearchBranch(oEvent: any): void {
        const sValue = oEvent.getParameter("value");
        const oFilter = new Filter("key", FilterOperator.Contains, sValue);
        oEvent.getSource().getBinding("items").filter([oFilter]);
    }

    /**
     * Handler para fechar ValueHelp de Filial
     */
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

    // ========== MÉTODOS PRIVADOS ==========

    /**
     * Exibe indicador de loading
     */
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

    /**
     * Oculta indicador de loading
     */
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

    /**
     * Desabilita/habilita botões
     */
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

    /**
     * Chama função de processamento
     */
    private _callFunctionImport(oPayload: any): void {
        this._oDataService!.callFunctionImport(oPayload)
            .then((oData: any) => {
                this._hideLoading();

                const oResult: IResultado = {
                    Status: oData.Status,
                    Mensagem: oData.Mensagem,
                    QuantidadeProcessada: parseInt(oData.QuantidadeProcessada) || 0,
                    DataProcessamento: oData.DataProcessamento || new Date().toLocaleString("pt-BR")
                };

                const oViewModel = this.getView()?.getModel("view") as JSONModel;
                oViewModel.setProperty("/resultado", oResult);
                oViewModel.setProperty("/resultadoVisivel", true);

                const oResourceBundle = this._getResourceBundle();
                if (oData.Status === "Sucesso") {
                    const sMsg = oResourceBundle?.getText("msgSucesso") || "Processamento concluído com sucesso!";
                    MessageToast.show(sMsg);
                } else {
                    MessageBox.warning(oData.Mensagem);
                }
            })
            .catch((oError: any) => {
                this._hideLoading();

                let sErrorMessage = "Erro ao processar. Tente novamente.";
                const oResourceBundle = this._getResourceBundle();

                try {
                    const oErrorResponse = JSON.parse(oError.responseText);
                    sErrorMessage = oErrorResponse.error.message.value;
                } catch (e) {
                    if (oError.statusCode === 0) {
                        sErrorMessage = "Erro de conexão. Verifique sua conexão com o servidor.";
                    } else {
                        sErrorMessage = oResourceBundle?.getText("msgErro") || sErrorMessage;
                    }
                }

                MessageBox.error(sErrorMessage);
                const oViewModel = this.getView()?.getModel("view") as JSONModel;
                oViewModel.setProperty("/resultadoVisivel", false);
            });
    }

    /**
     * Obtém o ResourceBundle
     */
    private _getResourceBundle(): ResourceBundle | undefined {
        const oI18nModel = this.getView()?.getModel("i18n") as ResourceModel;
        return oI18nModel?.getResourceBundle() as ResourceBundle;
    }
}