export interface Device {
  id: string
  hostname: string
  ip: string
  defaultLabel: string
  children?: Device[]
}

export interface DeviceGroup {
  name: string
  devices: Device[]
}

export const groups: DeviceGroup[] = [
  {
    name: 'Network',
    devices: [
      {
        id: 'router',
        hostname: 'OpenWrt',
        ip: '192.168.1.1',
        defaultLabel: 'Router (OpenWrt)',
      },
      {
        id: 'ap',
        hostname: 'EAP225-Outdoor',
        ip: '192.168.1.220',
        defaultLabel: 'Outdoor AP',
      },
    ],
  },
  {
    name: 'Compute',
    devices: [
      {
        id: 'compute-1',
        hostname: 'regenhub-compute-1',
        ip: '192.168.1.228',
        defaultLabel: 'Compute 1',
      },
      {
        id: 'compute-2',
        hostname: 'regenhub-compute-2',
        ip: '192.168.1.201',
        defaultLabel: 'Compute 2',
      },
      {
        id: 'compute-3',
        hostname: 'regenhub-compute-3',
        ip: '192.168.1.202',
        defaultLabel: 'Compute 3',
        children: [
          {
            id: 'compute-3-regenclaw',
            hostname: 'compute-3-regenclaw',
            ip: '192.168.1.168',
            defaultLabel: 'Regenclaw VM',
          },
        ],
      },
    ],
  },
  {
    name: 'Infrastructure',
    devices: [
      {
        id: 'homeassistant',
        hostname: 'homeassistant',
        ip: '192.168.1.141',
        defaultLabel: 'Home Assistant',
      },
      {
        id: 'member-manager',
        hostname: 'member-manager',
        ip: '192.168.1.108',
        defaultLabel: 'Member Manager',
      },
      {
        id: 'unforceds-mini',
        hostname: 'Unforceds-Mini',
        ip: '192.168.1.171',
        defaultLabel: 'Unforceds Mini',
      },
    ],
  },
]

export function allDevices(): Device[] {
  return groups.flatMap((g) =>
    g.devices.flatMap((d) => [d, ...(d.children ?? [])])
  )
}
