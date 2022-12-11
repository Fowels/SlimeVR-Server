import { useEffect, useRef } from 'react';
import { DefaultValues, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  ChangeSettingsRequestT,
  FilteringSettingsT,
  FilteringType,
  LegTweaksSettingsT,
  ModelSettingsT,
  ModelTogglesT,
  RpcMessage,
  SettingsRequestT,
  SettingsResponseT,
  SteamVRTrackersSettingT,
  TapDetectionSettingsT,
} from 'solarxr-protocol';
import { useConfig } from '../../../hooks/config';
import { useWebsocketAPI } from '../../../hooks/websocket-api';
import { CheckBox } from '../../commons/Checkbox';
import { SquaresIcon } from '../../commons/icon/SquaresIcon';
import { SteamIcon } from '../../commons/icon/SteamIcon';
import { WrenchIcon } from '../../commons/icon/WrenchIcons';
import { LangSelector } from '../../commons/LangSelector';
import { NumberSelector } from '../../commons/NumberSelector';
import { Radio } from '../../commons/Radio';
import { Typography } from '../../commons/Typography';
import { SettingsPageLayout } from '../SettingsPageLayout';

interface SettingsForm {
  trackers: {
    waist: boolean;
    chest: boolean;
    feet: boolean;
    knees: boolean;
    elbows: boolean;
    hands: boolean;
  };
  filtering: {
    type: number;
    amount: number;
  };
  toggles: {
    extendedSpine: boolean;
    extendedPelvis: boolean;
    extendedKnee: boolean;
    forceArmsFromHmd: boolean;
    floorClip: boolean;
    skatingCorrection: boolean;
  };
  tapDetection: {
    tapResetEnabled: boolean;
    tapResetDelay: number;
  };
  legTweaks: {
    correctionStrength: number;
  };
  interface: {
    devmode: boolean;
    watchNewDevices: boolean;
  };
}

const defaultValues = {
  trackers: {
    waist: false,
    chest: false,
    elbows: false,
    knees: false,
    feet: false,
    hands: false,
  },
  toggles: {
    extendedSpine: true,
    extendedPelvis: true,
    extendedKnee: true,
    forceArmsFromHmd: false,
    floorClip: false,
    skatingCorrection: false,
  },
  filtering: { amount: 0.1, type: FilteringType.NONE },
  tapDetection: { tapResetEnabled: false, tapResetDelay: 0.2 },
  legTweaks: { correctionStrength: 0.3 },
  interface: { devmode: false, watchNewDevices: true },
};

export function GeneralSettings() {
  const { t } = useTranslation();
  const { config, setConfig } = useConfig();
  const { state } = useLocation();
  const pageRef = useRef<HTMLFormElement | null>(null);

  const { sendRPCPacket, useRPCPacket } = useWebsocketAPI();
  const { reset, control, watch, handleSubmit } = useForm<SettingsForm>({
    defaultValues: defaultValues,
  });

  const onSubmit = (values: SettingsForm) => {
    const settings = new ChangeSettingsRequestT();

    if (values.trackers) {
      const trackers = new SteamVRTrackersSettingT();
      trackers.waist = values.trackers.waist;
      trackers.chest = values.trackers.chest;
      trackers.feet = values.trackers.feet;
      trackers.knees = values.trackers.knees;
      trackers.elbows = values.trackers.elbows;
      trackers.hands = values.trackers.hands;
      settings.steamVrTrackers = trackers;
    }

    const modelSettings = new ModelSettingsT();
    const toggles = new ModelTogglesT();
    const legTweaks = new LegTweaksSettingsT();
    toggles.floorClip = values.toggles.floorClip;
    toggles.skatingCorrection = values.toggles.skatingCorrection;
    toggles.extendedKnee = values.toggles.extendedKnee;
    toggles.extendedPelvis = values.toggles.extendedPelvis;
    toggles.extendedSpine = values.toggles.extendedSpine;
    toggles.forceArmsFromHmd = values.toggles.forceArmsFromHmd;
    legTweaks.correctionStrength = values.legTweaks.correctionStrength;

    modelSettings.toggles = toggles;
    modelSettings.legTweaks = legTweaks;
    settings.modelSettings = modelSettings;

    const tapDetection = new TapDetectionSettingsT();
    tapDetection.tapResetEnabled = values.tapDetection.tapResetEnabled;
    tapDetection.tapResetDelay = values.tapDetection.tapResetDelay;
    settings.tapDetectionSettings = tapDetection;

    const filtering = new FilteringSettingsT();
    filtering.type = values.filtering.type;
    filtering.amount = values.filtering.amount;
    settings.filtering = filtering;

    sendRPCPacket(RpcMessage.ChangeSettingsRequest, settings);

    setConfig({
      debug: values.interface.devmode,
      watchNewDevices: values.interface.watchNewDevices,
    });
  };

  useEffect(() => {
    const subscription = watch(() => handleSubmit(onSubmit)());
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    sendRPCPacket(RpcMessage.SettingsRequest, new SettingsRequestT());
  }, []);

  useRPCPacket(RpcMessage.SettingsResponse, (settings: SettingsResponseT) => {
    const formData: DefaultValues<SettingsForm> = {
      interface: {
        devmode: config?.debug,
        watchNewDevices: config?.watchNewDevices,
      },
    };

    if (settings.filtering) {
      formData.filtering = settings.filtering;
    }

    if (settings.steamVrTrackers) {
      formData.trackers = settings.steamVrTrackers;
    }

    if (settings.modelSettings?.toggles) {
      formData.toggles = Object.keys(settings.modelSettings?.toggles).reduce(
        (curr, key: string) => ({
          ...curr,
          [key]:
            (settings.modelSettings?.toggles &&
              (settings.modelSettings.toggles as any)[key]) ||
            false,
        }),
        {}
      );
    }

    if (settings.tapDetectionSettings) {
      formData.tapDetection = {
        tapResetDelay:
          settings.tapDetectionSettings.tapResetDelay ||
          defaultValues.tapDetection.tapResetDelay,
        tapResetEnabled:
          settings.tapDetectionSettings.tapResetEnabled ||
          defaultValues.tapDetection.tapResetEnabled,
      };
    }

    if (settings.modelSettings?.legTweaks) {
      formData.legTweaks = {
        correctionStrength:
          settings.modelSettings?.legTweaks.correctionStrength ||
          defaultValues.legTweaks.correctionStrength,
      };
    }

    reset(formData);
  });

  // Handle scrolling to selected page
  useEffect(() => {
    const typedState: { scrollTo: string } = state as any;
    if (!pageRef.current || !typedState || !typedState.scrollTo) {
      return;
    }
    const elem = pageRef.current.querySelector(`#${typedState.scrollTo}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state]);

  return (
    <form className="flex flex-col gap-2 w-full" ref={pageRef}>
      <SettingsPageLayout icon={<SteamIcon></SteamIcon>} id="steamvr">
        <>
          <Typography variant="main-title">
            {t('settings.general.steamvr.title')}
          </Typography>
          <Typography bold>{t('settings.general.steamvr.subtitle')}</Typography>
          <div className="flex flex-col py-2">
            <Typography color="secondary">
              {t('settings.general.steamvr.description.p0')}
            </Typography>
            <Typography color="secondary">
              {t('settings.general.steamvr.description.p1')}
            </Typography>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3">
            <CheckBox
              variant="toggle"
              outlined
              control={control}
              name="trackers.waist"
              label={t('settings.general.steamvr.trackers.waist')}
            />
            <CheckBox
              variant="toggle"
              outlined
              control={control}
              name="trackers.chest"
              label={t('settings.general.steamvr.trackers.chest')}
            />
            <CheckBox
              variant="toggle"
              outlined
              control={control}
              name="trackers.feet"
              label={t('settings.general.steamvr.trackers.feet')}
            />
            <CheckBox
              variant="toggle"
              outlined
              control={control}
              name="trackers.knees"
              label={t('settings.general.steamvr.trackers.knees')}
            />
            <CheckBox
              variant="toggle"
              outlined
              control={control}
              name="trackers.elbows"
              label={t('settings.general.steamvr.trackers.elbows')}
            />
            <CheckBox
              variant="toggle"
              outlined
              control={control}
              name="trackers.hands"
              label="Hands"
            />
          </div>
        </>
      </SettingsPageLayout>
      <SettingsPageLayout icon={<WrenchIcon></WrenchIcon>} id="mechanics">
        <>
          <Typography variant="main-title">
            {t('settings.general.tracker-mechanics.title')}
          </Typography>
          <Typography bold>
            {t('settings.general.tracker-mechanics.subtitle')}
          </Typography>
          <div className="flex flex-col pt-2 pb-4">
            <Typography color="secondary">
              {t('settings.general.tracker-mechanics.description.p0')}
            </Typography>
            <Typography color="secondary">
              {t('settings.general.tracker-mechanics.description.p1')}
            </Typography>
          </div>
          <Typography>
            {t('settings.general.tracker-mechanics.filtering-type.title')}
          </Typography>
          <div className="flex md:flex-row flex-col gap-3 pt-2">
            <Radio
              control={control}
              name="filtering.type"
              label={t(
                'settings.general.tracker-mechanics.filtering-type.none.label'
              )}
              desciption={t(
                'settings.general.tracker-mechanics.filtering-type.none.description'
              )}
              value={FilteringType.NONE}
            ></Radio>
            <Radio
              control={control}
              name="filtering.type"
              label={t(
                'settings.general.tracker-mechanics.filtering-type.smoothing.label'
              )}
              desciption={t(
                'settings.general.tracker-mechanics.filtering-type.smoothing.description'
              )}
              value={FilteringType.SMOOTHING}
            ></Radio>
            <Radio
              control={control}
              name="filtering.type"
              label={t(
                'settings.general.tracker-mechanics.filtering-type.prediction.label'
              )}
              desciption={t(
                'settings.general.tracker-mechanics.filtering-type.prediction.description'
              )}
              value={FilteringType.PREDICTION}
            ></Radio>
          </div>
          <div className="flex gap-5 pt-5 md:flex-row flex-col">
            <NumberSelector
              control={control}
              name="filtering.amount"
              label={t('settings.general.tracker-mechanics.amount.label')}
              valueLabelFormat={(value) => `${Math.round(value * 100)} %`}
              min={0.1}
              max={1.0}
              step={0.1}
            />
          </div>
        </>
      </SettingsPageLayout>
      <SettingsPageLayout icon={<WrenchIcon></WrenchIcon>} id="fksettings">
        <>
          <Typography variant="main-title">
            {t('settings.general.fk-settings.title')}
          </Typography>
          <Typography bold>
            {t('settings.general.fk-settings.leg-tweak.title')}
          </Typography>
          <div className="flex flex-col pt-2 pb-4">
            <Typography color="secondary">
              {t('settings.general.fk-settings.leg-tweak.description')}
            </Typography>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 pb-5">
            <CheckBox
              variant="toggle"
              outlined
              control={control}
              name="toggles.floorClip"
              label={t('settings.general.fk-settings.leg-tweak.floor-clip')}
            />
            <CheckBox
              variant="toggle"
              outlined
              control={control}
              name="toggles.skatingCorrection"
              label={t(
                'settings.general.fk-settings.leg-tweak.skating-correction'
              )}
            />
          </div>
          <div className="flex sm:grid cols-1 gap3 pb-5">
            <NumberSelector
              control={control}
              name="legTweaks.correctionStrength"
              label={t(
                'settings.general.fk-settings.leg-tweak.skating-correction-amount'
              )}
              valueLabelFormat={(value) => `${Math.round(value * 100)} %`}
              min={0.1}
              max={1.0}
              step={0.1}
            />
          </div>

          <Typography bold>
            {t('settings.general.fk-settings.arm-fk.title')}
          </Typography>
          <div className="flex flex-col pt-2 pb-4">
            <Typography color="secondary">
              {t('settings.general.fk-settings.arm-fk.description')}
            </Typography>
          </div>
          <div className="grid sm:grid-cols-2 pb-5">
            <CheckBox
              variant="toggle"
              outlined
              control={control}
              name="toggles.forceArmsFromHmd"
              label={t('settings.general.fk-settings.arm-fk.force-arms')}
            />
          </div>
          {config?.debug && (
            <>
              <Typography bold>
                {t('settings.general.fk-settings.skeleton-settings.title')}
              </Typography>
              <div className="flex flex-col pt-2 pb-4">
                <Typography color="secondary">
                  {t(
                    'settings.general.fk-settings.skeleton-settings.description'
                  )}
                </Typography>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 pb-5">
                <CheckBox
                  variant="toggle"
                  outlined
                  control={control}
                  name="toggles.extendedSpine"
                  label={t(
                    'settings.general.fk-settings.skeleton-settings.extended-spine'
                  )}
                />
                <CheckBox
                  variant="toggle"
                  outlined
                  control={control}
                  name="toggles.extendedPelvis"
                  label={t(
                    'settings.general.fk-settings.skeleton-settings.extended-pelvis'
                  )}
                />
                <CheckBox
                  variant="toggle"
                  outlined
                  control={control}
                  name="toggles.extendedKnee"
                  label={t(
                    'settings.general.fk-settings.skeleton-settings.extended-knees'
                  )}
                />
              </div>
            </>
          )}
        </>
      </SettingsPageLayout>

      <SettingsPageLayout icon={<WrenchIcon></WrenchIcon>} id="gestureControl">
        <>
          <Typography variant="main-title">
            {t('settings.general.gesture-control.title')}
          </Typography>
          <Typography bold>
            {t('settings.general.gesture-control.subtitle')}
          </Typography>
          <div className="flex flex-col pt-2 pb-4">
            <Typography color="secondary">
              {t('settings.general.gesture-control.description')}
            </Typography>
          </div>
          <div className="grid sm:grid-cols-1 gap-3 pb-5">
            <CheckBox
              variant="toggle"
              outlined
              control={control}
              name="tapDetection.tapResetEnabled"
              label={t('settings.general.gesture-control.enable')}
            />
            <NumberSelector
              control={control}
              name="tapDetection.tapResetDelay"
              label={t('settings.general.gesture-control.delay')}
              valueLabelFormat={(value) => `${Math.round(value * 10) / 10} s`}
              min={0.2}
              max={3.0}
              step={0.2}
            />
          </div>
        </>
      </SettingsPageLayout>

      <SettingsPageLayout icon={<SquaresIcon></SquaresIcon>} id="interface">
        <>
          <Typography variant="main-title">
            {t('settings.general.interface.title')}
          </Typography>
          <div className="gap-4 grid">
            <div className="grid sm:grid-cols-2">
              <div>
                <Typography bold>
                  {t('settings.general.interface.dev-mode.title')}
                </Typography>
                <div className="flex flex-col">
                  <Typography color="secondary">
                    {t('settings.general.interface.dev-mode.description')}
                  </Typography>
                </div>
                <div className="pt-2">
                  <CheckBox
                    variant="toggle"
                    control={control}
                    outlined
                    name="interface.devmode"
                    label={t('settings.general.interface.dev-mode.label')}
                  />
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2">
              <div>
                <Typography bold>
                  {t('settings.general.interface.serial-detection.title')}
                </Typography>
                <div className="flex flex-col">
                  <Typography color="secondary">
                    {t(
                      'settings.general.interface.serial-detection.description'
                    )}
                  </Typography>
                </div>
                <div className="pt-2">
                  <CheckBox
                    variant="toggle"
                    control={control}
                    outlined
                    name="interface.watchNewDevices"
                    label={t(
                      'settings.general.interface.serial-detection.label'
                    )}
                  />
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2">
              <div>
                <Typography bold>
                  {t('settings.general.interface.lang.title')}
                </Typography>
                <div className="flex flex-col">
                  <Typography color="secondary">
                    {t('settings.general.interface.lang.description')}
                  </Typography>
                </div>
                <div className="pt-2">
                  <LangSelector />
                </div>
              </div>
            </div>
          </div>
        </>
      </SettingsPageLayout>
    </form>
  );
}
