# awslib（AWS stdlib 图标族）清单

来源：（38 个 catalog fixture，逐条提取宏名）。

## 用法

```plantuml
!include <awslib/AWSCommon>
!include <awslib/<Category>/all.puml>   ' 按宏所属家族逐个 include
MacroName(alias, "Label", " ")        ' 第三个参数是副标题行（不用时给一个空格）
```

> ⚠️ **宏名存在 ≠ 家族已加载**：漏 include 会静默失败或报错。写示例前先用下面的 lookup 查家族。

## 家族总览

| 家族 | 宏数量 | 典型服务 |
|---|---|---|
| `Analytics` | 29 | Glue / Athena / Kinesis / Redshift / QuickSight / EMR |
| `ApplicationIntegration` | 24 | APIGateway / EventBridge / SQS / SNS / StepFunction* / MQ |
| `BlockChain` | 3 |  |
| `BusinessApplications` | 14 |  |
| `CloudFinancialManagement` | 2 | ApplicationCostProfiler / ReservedInstanceReporting |
| `Compute` | 108 | EC2 机型 / Lambda / Batch / 迁移与容器相关 |
| `Containers` | 12 | ECS / ECR / ECS Anywhere / Copilot |
| `CustomerEnablement` | 2 |  |
| `Database` | 42 | Aurora 变体 / DynamoDB / DocumentDB |
| `DeveloperTools` | 9 | Code* 家族 / Cloud9 / CodeArtifact |
| `EndUserComputing` | 4 |  |
| `FrontEndWebMobile` | 9 |  |
| `GameTech` | 1 |  |
| `GroupIcons` | 10 | VPC / Region / AZ / SG / ASG 等**分组框**图标 |
| `InternetOfThings` | 94 | IoTCore / IoTAnalytics* / IoTDeviceManagement / FreeRTOS / 设备与传感器 |
| `MachineLearning` | 16 | SageMaker 家族 / Rekognition / Textract / Polly / Lex |
| `ManagementGovernance` | 63 | CloudWatch* / CloudTrail / Config / CloudFormation / SystemsManager* / AutoScaling |
| `MediaServices` | 5 |  |
| `MigrationTransfer` | 20 | MigrationHub / DataSync / DMS / Snowball / TransferFamily / MainframeModernization |
| `NetworkingContentDelivery` | 54 | VPC / Subnet / ELB* / CloudFront / Route53 / DirectConnect / CloudWAN |
| `Robotics` | 4 |  |
| `SecurityIdentityCompliance` | 44 | IAM* / KMS / SecretsManager / Inspector / Macie / WAF / Shield / Cognito |
| `Storage` | 65 | S3 全系（Bucket/Glacier/Objects/…） / StorageGateway / EFS? |
| `general` | 40 | 跨家族常用（StepFunction / XRay / SimpleXxx 等） |

## 宏 → 家族 lookup（写示例时查这张表）

### Analytics (29)

Analytics · Athena · CloudSearch · CloudSearchSearchDocuments · DataExchange · DataPipeline · EMR · EMRCluster · EMREMREngine · EMRHDFSCluster · Glue · GlueCrawler · GlueDataBrew · GlueDataCatalog · GlueElasticViews · Kinesis · KinesisDataAnalytics · KinesisDataStreams · KinesisFirehose · KinesisVideoStreams · MSKAmazonMSKConnect · ManagedStreamingforApacheKafka · OpenSearchService · QuickSight · Redshift · RedshiftDenseComputeNode · RedshiftDenseStorageNode · RedshiftML · RedshiftRA3

### ApplicationIntegration (24)

APIGateway · APIGatewayEndpoint · AppSync · ApplicationIntegration · ConsoleMobileApplication · EventBridge · EventBridgeCustomEventBus · EventBridgeDefaultEventBus · EventBridgeEvent · EventBridgeRule · EventBridgeSaasPartnerEvent · EventBridgeSchema · EventBridgeSchemaRegistry · ExpressWorkflows · MQBroker · ManagedWorkflowsforApacheAirflow · SimpleNotificationService · SimpleNotificationServiceEmailNotification · SimpleNotificationServiceHTTPNotification · SimpleNotificationServiceTopic · SimpleQueueService · SimpleQueueServiceMessage · SimpleQueueServiceQueue · StepFunctions

### BlockChain (3)

Blockchain · ManagedBlockchain · ManagedBlockchainBlockchain

### BusinessApplications (14)

AlexaForBusiness · BusinessApplications · Chime · ChimeSDK · ChimeVoiceConnector · Connect · Pinpoint · PinpointAPIs · PinpointJourney · SimpleEmailService · SimpleEmailServiceEmail · WorkDocs · WorkDocsSDK · WorkMail

### CloudFinancialManagement (2)

ApplicationCostProfiler · ReservedInstanceReporting

### Compute (108)

ApplicationAutoScaling · Batch · Compute · EC2 · EC2A1Instance · EC2AMI · EC2AWSInferentia · EC2AWSMicroserviceExtractorforNET · EC2AutoScaling · EC2AutoScalingResource · EC2C4Instance · EC2C5Instance · EC2C5aInstance · EC2C5adInstance · EC2C5dInstance · EC2C5nInstance · EC2C6aInstance · EC2C6gInstance · EC2C6gdInstance · EC2C6gnInstance · EC2C6iInstance · EC2C7gInstance · EC2D2Instance · EC2D3Instance · EC2D3enInstance · EC2DBInstance · EC2DL1Instance · EC2ElasticIPAddress · EC2F1Instance · EC2G3Instance · EC2G4adInstance · EC2G4dnInstance · EC2G5Instance · EC2G5gInstance · EC2H1Instance · EC2HMIInstance · EC2HabanaGaudiInstance · EC2Hpc6aInstance · EC2I2Instance · EC2I3Instance · EC2I3enInstance · EC2I4iInstance · EC2Im4gnInstance · EC2ImageBuilder · EC2Inf1Instance · EC2Instance · EC2Instances · EC2InstancewithCloudWatch · EC2Is4genInstance · EC2M1MacInstance · EC2M4Instance · EC2M5Instance · EC2M5aInstance · EC2M5dInstance · EC2M5dnInstance · EC2M5nInstance · EC2M5znInstance · EC2M6aInstance · EC2M6gInstance · EC2M6gdInstance · EC2M6iInstance · EC2MacInstance · EC2P2Instance · EC2P3Instance · EC2P3dnInstance · EC2P4Instance · EC2P4dInstance · EC2P4deInstance · EC2R4Instance · EC2R5Instance · EC2R5aInstance · EC2R5adInstance · EC2R5bInstance · EC2R5dInstance · EC2R5gdInstance · EC2R5nInstance · EC2R6gInstance · EC2R6iInstance · EC2RdnInstance · EC2Rescue · EC2SpotInstance · EC2T2Instance · EC2T3Instance · EC2T3aInstance · EC2T4gInstance · EC2TrainiumInstance · EC2Trn1Instance · EC2VT1Instance · EC2X1Instance · EC2X1eInstance · EC2X2gdInstance · EC2X2idnInstance · EC2X2iednInstance · EC2X2ieznInstance · EC2z1dInstance · ElasticBeanstalk · ElasticBeanstalkApplication · ElasticBeanstalkDeployment · ElasticFabricAdapter · GenomicsCLI · Lambda · LambdaLambdaFunction · Lightsail · Outpostsrack · Outpostsservers · ParallelCluster · ServerlessApplicationRepository · ThinkboxXMesh

### Containers (12)

ECSAnywhere · ElasticContainerRegistry · ElasticContainerRegistryImage · ElasticContainerRegistryRegistry · ElasticContainerService · ElasticContainerServiceContainer1 · ElasticContainerServiceContainer2 · ElasticContainerServiceContainer3 · ElasticContainerServiceCopilotCLI · ElasticContainerServiceECSAnywhere · ElasticContainerServiceService · ElasticContainerServiceTask

### CustomerEnablement (2)

ManagedServices · Support

### Database (42)

Aurora · AuroraAmazonAuroraInstancealternate · AuroraAmazonRDSInstance · AuroraAmazonRDSInstanceAternate · AuroraInstance · AuroraMariaDBInstance · AuroraMariaDBInstanceAlternate · AuroraMySQLInstance · AuroraMySQLInstanceAlternate · AuroraOracleInstance · AuroraOracleInstanceAlternate · AuroraPIOPSInstance · AuroraPostgreSQLInstance · AuroraPostgreSQLInstanceAlternate · AuroraSQLServerInstance · AuroraSQLServerInstanceAlternate · Database · DatabaseMigrationService · DatabaseMigrationServiceDatabasemigrationworkflowjob · DocumentDB · DynamoDB · DynamoDBAmazonDynamoDBAccelerator · DynamoDBAttribute · DynamoDBAttributes · DynamoDBGlobalsecondaryindex · DynamoDBItem · DynamoDBItems · DynamoDBStandardAccessTableClass · DynamoDBStandardInfrequentAccessTableClass · DynamoDBStream · DynamoDBTable · ElastiCache · ElastiCacheCacheNode · ElastiCacheElastiCacheforMemcached · ElastiCacheElastiCacheforRedis · MemoryDBforRedis · RDS · RDSMultiAZ · RDSMultiAZDBCluster · RDSProxyInstance · RDSProxyInstanceAlternate · RDSonVMware

### DeveloperTools (9)

Cloud9 · Cloud9Cloud9 · CodeArtifact · CodeBuild · CodeCommit · CodeDeploy · CodePipeline · CodeStar · XRay

### EndUserComputing (4)

AppStream · EndUserComputing · WorkSpaces · WorkSpacesWeb

### FrontEndWebMobile (9)

Amplify · AmplifyAWSAmplifyStudio · DeviceFarm · LocationService · LocationServiceGeofence · LocationServiceMap · LocationServicePlace · LocationServiceRoutes · LocationServiceTrack

### GameTech (1)

GameLift

### GroupIcons (10)

AutoScalingGroup · Cloud · CorporateDataCenter · EC2InstanceContainer · ElasticBeanstalkContainer · Region · StepFunction · VPCSubnetPrivate · VPCSubnetPublic · VirtualPrivateCloudVPC

### InternetOfThings (94)

FreeRTOS · InternetOfThings · IoT1Click · IoTAction · IoTActuator · IoTAlexaEnabledDevice · IoTAlexaSkill · IoTAlexaVoiceService · IoTAnalytics · IoTAnalyticsChannel · IoTAnalyticsDataStore · IoTAnalyticsDataset · IoTAnalyticsNotebook · IoTAnalyticsPipeline · IoTButton · IoTCertificate · IoTCore · IoTDesiredState · IoTDeviceDefender · IoTDeviceDefenderIoTDeviceJobs · IoTDeviceGateway · IoTDeviceManagement · IoTDeviceManagementFleetHub · IoTEcho · IoTEduKit · IoTEvents · IoTExpressLink · IoTFireTV · IoTFireTVStick · IoTFleetWise · IoTGreengrass · IoTGreengrassArtifact · IoTGreengrassComponent · IoTGreengrassComponentMachineLearning · IoTGreengrassComponentNucleus · IoTGreengrassComponentPrivate · IoTGreengrassComponentPublic · IoTGreengrassConnector · IoTGreengrassInterprocessCommunication · IoTGreengrassProtocol · IoTGreengrassRecipe · IoTGreengrassStreamManager · IoTHTTP2Protocol · IoTHTTPProtocol · IoTHardwareBoard · IoTLambdaFunction · IoTLoRaWANProtocol · IoTMQTTProtocol · IoTOverAirUpdate · IoTPolicy · IoTReportedState · IoTRoboRunner · IoTRule · IoTSailboat · IoTSensor · IoTServo · IoTShadow · IoTSimulator · IoTSiteWise · IoTSiteWiseAsset · IoTSiteWiseAssetHierarchy · IoTSiteWiseAssetModel · IoTSiteWiseAssetProperties · IoTSiteWiseDataStreams · IoTThingBank · IoTThingBicycle · IoTThingCamera · IoTThingCar · IoTThingCart · IoTThingCoffeePot · IoTThingDoorLock · IoTThingFactory · IoTThingFreeRTOSDevice · IoTThingGeneric · IoTThingHouse · IoTThingHumiditySensor · IoTThingIndustrialPC · IoTThingLightbulb · IoTThingMedicalEmergency · IoTThingPLC · IoTThingPoliceEmergency · IoTThingRelay · IoTThingStacklight · IoTThingTemperatureHumiditySensor · IoTThingTemperatureSensor · IoTThingTemperatureVibrationSensor · IoTThingThermostat · IoTThingTravel · IoTThingUtility · IoTThingVibrationSensor · IoTThingWindfarm · IoTThingsGraph · IoTTopic · IoTTwinMaker

### MachineLearning (16)

DeepLearningAMIs · DevOpsGuru · DevOpsGuruInsights · Lex · LookoutforMetrics · MachineLearning · Polly · Rekognition · RekognitionImage · RekognitionVideo · SageMaker · SageMakerCanvas · SageMakerModel · SageMakerNotebook · SageMakerTrain · Textract

### ManagementGovernance (63)

AppConfig · ApplicationAutoScaling2 · AutoScaling · BackintAgent · Chatbot · CloudFormation · CloudFormationChangeSet · CloudFormationStack · CloudFormationTemplate · CloudTrail · CloudWatch · CloudWatchAlarm · CloudWatchEventEventBased · CloudWatchEventTimeBased · CloudWatchEvidently · CloudWatchLogs · CloudWatchMetricsInsights · CloudWatchRUM · CloudWatchRule · CloudWatchSynthetics · Config · FaultInjectionSimulator · LicenseManager · LicenseManagerApplicationDiscovery · LicenseManagerLicenseBlending · ManagedGrafana · ManagedServiceforPrometheus · ManagementConsole · OpsWorks · OpsWorksApps · OpsWorksDeployments · OpsWorksInstances · OpsWorksLayers · OpsWorksMonitoring · OpsWorksPermissions · OpsWorksResources · OpsWorksStack2 · Organizations · OrganizationsAccount · OrganizationsManagementAccount · OrganizationsOrganizationalUnit · ServiceCatalog · SystemsManager · SystemsManagerAutomation · SystemsManagerChangeCalendar · SystemsManagerChangeManager · SystemsManagerCompliance · SystemsManagerDocuments · SystemsManagerIncidentManager · SystemsManagerInventory · SystemsManagerMaintenanceWindows · SystemsManagerOpsCenter · SystemsManagerParameterStore · SystemsManagerPatchManager · SystemsManagerRunCommand · SystemsManagerSessionManager · SystemsManagerStateManager · TrustedAdvisor · TrustedAdvisorChecklist · TrustedAdvisorChecklistCost · TrustedAdvisorChecklistFaultTolerant · TrustedAdvisorChecklistPerformance · TrustedAdvisorChecklistSecurity

### MediaServices (5)

CloudDigitalInterface · ElasticTranscoder · ElementalMediaConnect · KinesisVideoStreams2 · MediaServices

### MigrationTransfer (20)

ApplicationDiscoveryService · ApplicationMigrationService · DataSync · DatasyncAgent · MainframeModernization · MainframeModernizationAnalyzer · MainframeModernizationCompiler · MainframeModernizationConverter · MainframeModernizationDeveloper · MainframeModernizationRuntime · MigrationEvaluator · MigrationHub · MigrationHubRefactorSpacesApplications · MigrationHubRefactorSpacesEnvironments · MigrationHubRefactorSpacesServices · ServerMigrationService · TransferFamily · TransferFamilyAWSFTP · TransferFamilyAWSFTPS · TransferFamilyAWSSFTP

### NetworkingContentDelivery (54)

AppMesh · AppMeshMesh · AppMeshVirtualGateway · AppMeshVirtualNode · AppMeshVirtualRouter · AppMeshVirtualService · ClientVPN · CloudDirectory2 · CloudFront · CloudFrontDownloadDistribution · CloudFrontEdgeLocation · CloudFrontFunctions · CloudFrontStreamingDistribution · CloudMapNamespace · CloudMapResource · CloudWAN · CloudWANCoreNetworkEdge · CloudWANSegmentNetwork · CloudWANVirtualPoP · DirectConnect · DirectConnectGateway · ElasticLoadBalancing · ElasticLoadBalancingApplicationLoadBalancer · ElasticLoadBalancingClassicLoadBalancer · ElasticLoadBalancingGatewayLoadBalancer · ElasticLoadBalancingNetworkLoadBalancer · Route53 · Route53ApplicationRecoveryController · Route53HostedZone · Route53ReadinessChecks · Route53Resolver · Route53ResolverDNSFirewall · Route53ResolverQueryLogging · Route53RouteTable · Route53RoutingControls · TransitGateway · TransitGatewayAttachment · VPCCarrierGateway · VPCCustomerGateway · VPCElasticNetworkAdapter · VPCElasticNetworkInterface · VPCEndpoints · VPCFlowLogs · VPCInternetGateway · VPCNATGateway · VPCNetworkAccessAnalyzer · VPCNetworkAccessControlList · VPCPeeringConnection · VPCReachabilityAnalyzer · VPCRouter · VPCTrafficMirroring · VPCVPNConnection · VPCVPNGateway · VirtualPrivateCloud

### Robotics (4)

RoboMakerCloudExtensionsROS · RoboMakerDevelopmentEnvironment · RoboMakerFleetManagement · RoboMakerSimulation

### SecurityIdentityCompliance (44)

Artifact · AuditManager · CertificateManager · CertificateManagerCertificateAuthority · CloudDirectory · CloudHSM · Cognito · DirectoryService · DirectoryServiceADConnector · DirectoryServiceAWSManagedMicrosoftAD · DirectoryServiceSimpleAD · IAMIdentityCenter · IdentityAccessManagementAWSSTS · IdentityAccessManagementAWSSTSAlternate · IdentityAccessManagementAddon · IdentityAccessManagementDataEncryptionKey · IdentityAccessManagementEncryptedData · IdentityAccessManagementIAMAccessAnalyzer · IdentityAccessManagementIAMRolesAnywhere · IdentityAccessManagementLongTermSecurityCredential · IdentityAccessManagementMFAToken · IdentityAccessManagementPermissions · IdentityAccessManagementRole · IdentityAccessManagementTemporarySecurityCredential · IdentityandAccessManagement · Inspector · InspectorAgent · KeyManagementService · Macie · NetworkFirewall · NetworkFirewallEndpoints · ResourceAccessManager · SecretsManager · SecurityHubFinding · Shield · ShieldAWSShieldAdvanced · WAF · WAFBadBot · WAFBot · WAFBotControl · WAFFilteringRule · WAFLabels · WAFManagedRule · WAFRule

### Storage (65)

Backup · BackupAWSBackupsupportforAmazonFSxforNetAppONTAP · BackupAWSBackupsupportforAmazonS3 · BackupBackupPlan · BackupBackupRestore · BackupBackupVault · BackupComplianceReporting · BackupCompute · BackupDatabase · BackupGateway · BackupRecoveryPointObjective · BackupRecoveryTimeObjective · BackupStorage · BackupVirtualMachine · BackupVirtualMachineMonitor · CloudEndureDisasterRecovery · EFS · ElasticBlockStore · ElasticBlockStoreAmazonDataLifecycleManager · ElasticBlockStoreMultipleVolumes · ElasticBlockStoreSnapshot · ElasticBlockStoreVolume · ElasticBlockStoreVolumegp3 · ElasticFileSystemFileSystem · ElasticFileSystemIntelligentTiering · ElasticFileSystemOneZone · ElasticFileSystemOneZoneInfrequentAccess · ElasticFileSystemStandard · ElasticFileSystemStandardInfrequentAccess · FSx · S3onOutposts · SimpleStorageService · SimpleStorageServiceBucket · SimpleStorageServiceBucketWithObjects · SimpleStorageServiceGeneralAccessPoints · SimpleStorageServiceGlacier · SimpleStorageServiceGlacierArchive · SimpleStorageServiceGlacierVault · SimpleStorageServiceObject · SimpleStorageServiceS3GlacierDeepArchive · SimpleStorageServiceS3GlacierFlexibleRetrieval · SimpleStorageServiceS3GlacierInstantRetrieval · SimpleStorageServiceS3IntelligentTiering · SimpleStorageServiceS3ObjectLambda · SimpleStorageServiceS3ObjectLambdaAccessPoints · SimpleStorageServiceS3OnOutposts · SimpleStorageServiceS3OneZoneIA · SimpleStorageServiceS3Replication · SimpleStorageServiceS3ReplicationTimeControl · SimpleStorageServiceS3Standard · SimpleStorageServiceS3StandardIA · SimpleStorageServiceS3StorageLens · SimpleStorageServiceVPCAccessPoints · Snowball · SnowballEdge · SnowballSnowballImportExport · StorageGateway · StorageGatewayAmazonFSxFileGateway · StorageGatewayAmazonS3FileGateway · StorageGatewayCachedVolume · StorageGatewayFileGateway · StorageGatewayNoncachedVolume · StorageGatewayTapeGateway · StorageGatewayVirtualTapeLibrary · StorageGatewayVolumeGateway

### general (40)

AWSManagementConsole · Alert · Camera · Chat · Client · Disk · Document · Documents · Email · Firewall · Folder · Folders · Forums · Gear · GenericApplication · Genericdatabase · GitRepository · Globe · Internet · Internetalt1 · Internetalt2 · MagnifyingGlass · MarketplaceDark · MarketplaceLight · Mobileclient · Multimedia · Officebuilding · Question · Recover · SAMLtoken · SDK · SSLpadlock · Servers · Shield2 · SourceCode · Tapestorage · Toolkit · Traditionalserver · User · Users


## 常见 include 归属（实测踩坑记录，2026-09-21）

写示例时最容易被"按直觉"放错家族的宏：

| 宏 | 实际所在家族 | 直觉上容易放错到 |
|---|---|---|
| `StepFunction` | **GroupIcons** | general / ApplicationIntegration |
| `Snowball` / `SnowballEdge` / `DataSync` | **Storage** | MigrationTransfer |
| `DatabaseMigrationService` (DMS) | **Database** | MigrationTransfer |
| `XRay` | **DeveloperTools** | ManagementGovernance |
| `AutoScalingGroup` / `VPCSubnetPublic` / `VPCSubnetPrivate` / `VirtualPrivateCloudVPC` / `Region` | **GroupIcons** | Compute / NetworkingContentDelivery |
| `CloudTrail` / `Config` / `CloudFormation*` / `CloudWatch*` / `SystemsManager*` / `ManagedGrafana` / `ManagedServiceforPrometheus` | **ManagementGovernance** | 按名字猜会放进 CloudWatch 之类 |
| `ElasticLoadBalancing*` / `Route53*` / `CloudFront*` / `DirectConnect` / `CloudWAN*` | **NetworkingContentDelivery** | — |
| `Inspector` / `Macie` / `WAF` / `Shield` / `NetworkFirewall` / `AuditManager` / `CloudHSM` / `Cognito` / IAM* | **SecurityIdentityCompliance** | — |
| `SimpleNotificationService` / `SimpleQueueService` / `EventBridge` / `APIGateway*` / `AppSync` / `MQBroker` | **ApplicationIntegration** | — |
| `FreeRTOS` / `IoTCore` / `IoTDeviceManagement` / `IoTGreengrass*` / `IoTEvents` / `IoTDeviceDefender` | **InternetOfThings** | — |
| `SageMaker*` / `Rekognition*` / `Textract` / `Polly` / `Lex` | **MachineLearning** | — |
| `Glue*` / `Athena` / `Kinesis*` / `Redshift` / `QuickSight` / `EMR*` | **Analytics** | — |

**两条硬规则**（都由官方 PlantUML 校验实测确认）：
1. 用到的宏 **必须**有对应 `!include <awslib/<Family>/all.puml>`，否则报 “Some diagram description contains errors”。
2. `general/all.puml` 只提供通用图标（User / Server / Firewall / Internet / Document …），**不包含** StepFunction 这类"看起来通用"的服务宏。
