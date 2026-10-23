import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense } from 'react';
import { MeshDistortMaterial, Environment, ContactShadows, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Burger Component
function Burger({ position }) {
  const groupRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.1;
      groupRef.current.position.y = position[1] + Math.sin(t * 0.5) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Bottom Bun */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.9, 0.3, 32]} />
        <meshStandardMaterial color="#D2691E" roughness={0.4} metalness={0.1} />
      </mesh>
      
      {/* Sesame Seeds */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 0.5 + Math.random() * 0.2;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              0.16,
              Math.sin(angle) * radius
            ]}
            castShadow
          >
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#F5DEB3" />
          </mesh>
        );
      })}
      
      {/* Lettuce */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.85, 0.85, 0.08, 32]} />
        <MeshDistortMaterial color="#90EE90" distort={0.4} speed={2} roughness={0.6} />
      </mesh>
      
      {/* Tomato */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.12, 32]} />
        <meshStandardMaterial color="#FF6347" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Cheese */}
      <mesh position={[0, 0.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[1.5, 0.08, 1.5]} />
        <meshStandardMaterial color="#FFD700" roughness={0.4} />
      </mesh>
      
      {/* Patty */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.75, 0.75, 0.25, 32]} />
        <meshStandardMaterial color="#8B4513" roughness={0.6} metalness={0.2} />
      </mesh>
      
      {/* Top Bun */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <sphereGeometry args={[0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#CD853F" roughness={0.4} metalness={0.1} />
      </mesh>
    </group>
  );
}

// Pizza Slice Component
function PizzaSlice({ position }) {
  const groupRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.4;
      groupRef.current.position.y = position[1] + Math.cos(t * 0.6) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, 0, 0]}>
      {/* Pizza Base */}
      <mesh castShadow>
        <coneGeometry args={[1, 0.2, 32, 1, false, 0, Math.PI / 3]} />
        <meshStandardMaterial color="#FFD700" roughness={0.5} />
      </mesh>
      
      {/* Cheese Layer */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <coneGeometry args={[0.98, 0.15, 32, 1, false, 0, Math.PI / 3]} />
        <meshStandardMaterial color="#FFF8DC" roughness={0.4} />
      </mesh>
      
      {/* Pepperoni */}
      {[...Array(5)].map((_, i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI) / 15) * (0.3 + i * 0.12),
            0.22,
            Math.sin((i * Math.PI) / 15) * (0.3 + i * 0.12)
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.12, 0.12, 0.04, 16]} />
          <meshStandardMaterial color="#C41E3A" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// Ice Cream Component
function IceCream({ position }) {
  const groupRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = -Math.sin(t * 0.5) * 0.15;
      groupRef.current.position.y = position[1] + Math.sin(t * 0.7 + 1) * 0.06;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Cone */}
      <mesh rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[0.4, 1.2, 32]} />
        <meshStandardMaterial color="#DEB887" roughness={0.6} />
      </mesh>
      
      {/* Waffle Pattern */}
      {[...Array(8)].map((_, i) => (
        <mesh
          key={i}
          position={[0, -0.6 + i * 0.15, 0]}
          rotation={[0, (i * Math.PI) / 4, Math.PI / 2]}
          castShadow
        >
          <torusGeometry args={[0.35, 0.02, 8, 32]} />
          <meshStandardMaterial color="#CD853F" />
        </mesh>
      ))}
      
      {/* Ice Cream Scoops */}
      <Sphere args={[0.45, 32, 32]} position={[0, 0.9, 0]} castShadow>
        <MeshDistortMaterial color="#FFB6C1" distort={0.3} speed={1.5} roughness={0.2} metalness={0.1} />
      </Sphere>
      
      <Sphere args={[0.4, 32, 32]} position={[0, 1.45, 0]} castShadow>
        <MeshDistortMaterial color="#87CEEB" distort={0.3} speed={1.5} roughness={0.2} metalness={0.1} />
      </Sphere>
      
      <Sphere args={[0.35, 32, 32]} position={[0, 1.9, 0]} castShadow>
        <MeshDistortMaterial color="#FAFAD2" distort={0.3} speed={1.5} roughness={0.2} metalness={0.1} />
      </Sphere>
      
      {/* Cherry on Top */}
      <mesh position={[0, 2.35, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#DC143C" roughness={0.2} metalness={0.3} />
      </mesh>
      
      <mesh position={[0, 2.45, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
    </group>
  );
}

// Main Scene Component
function Scene({ motionEnabled, pointer }) {
  const groupRef = useRef();
  const target = useRef(new THREE.Vector2(0, 0));

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (pointer && motionEnabled) {
      target.current.lerp(new THREE.Vector2(pointer.x, pointer.y), 0.1);
    }

    if (groupRef.current && motionEnabled) {
      groupRef.current.rotation.y = target.current.x * 0.8 + Math.sin(t * 0.2) * 0.1;
      groupRef.current.rotation.x = -target.current.y * 0.3;
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <Burger position={[-2.5, 0, 0]} />
        <PizzaSlice position={[0, 0, 0]} />
        <IceCream position={[2.5, -0.5, 0]} />
      </group>
      
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#FFB6C1" />
      <pointLight position={[5, 5, 5]} intensity={0.8} color="#FFF8DC" />
      
      <ContactShadows position={[0, -2, 0]} opacity={0.5} scale={15} blur={2.5} far={4} />
    </>
  );
}

const FoodScene = ({ motionEnabled = true, interactive = true }) => {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 2, 8], fov: 40 }}
      style={{ 
        touchAction: interactive ? 'none' : 'auto', 
        pointerEvents: interactive ? 'auto' : 'none',
        background: 'transparent'
      }}
      onPointerMove={
        interactive
          ? (e) => {
              const { offsetX, offsetY } = e.nativeEvent;
              const { clientWidth, clientHeight } = e.currentTarget;
              setPointer({
                x: (offsetX / clientWidth) * 2 - 1,
                y: -((offsetY / clientHeight) * 2 - 1),
              });
            }
          : undefined
      }
      onPointerLeave={interactive ? () => setPointer({ x: 0, y: 0 }) : undefined}
    >
      <Suspense fallback={null}>
        <Scene motionEnabled={motionEnabled} pointer={pointer} />
        <Environment preset="sunset" />
      </Suspense>
    </Canvas>
  );
};

export default FoodScene;
