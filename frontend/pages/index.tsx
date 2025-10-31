import { Box, Button, Container, Heading, VStack, Text, useDisclosure } from '@chakra-ui/react';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import the WalletMultiButton with SSR disabled
const WalletMultiButtonWrapper = dynamic(
  () => import('../components/WalletMultiButtonWrapper'),
  { ssr: false }
);
import { useDraw } from '@/contexts/DrawContext';
import CreateDrawModal from '../components/CreateDrawModal';
import DrawList from '@/components/DrawList';

const Home = () => {
  const { publicKey } = useWallet();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateDraw = async (drawData: any) => {
    setIsLoading(true);
    try {
      // TODO: Implement create draw on-chain
      console.log('Creating draw:', drawData);
      onClose();
    } catch (error) {
      console.error('Error creating draw:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch draws when the component mounts or when the public key changes
  const { fetchDraws } = useDraw();
  
  useEffect(() => {
    if (publicKey) {
      fetchDraws();
    }
  }, [publicKey, fetchDraws]);

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8}>
        <Heading as="h1" size="2xl" textAlign="center">
          🎟️ VeriDraws
        </Heading>
        <Text fontSize="xl" textAlign="center">
          Transparent and verifiable prize draws on Solana
        </Text>

        <Box>
          <WalletMultiButtonWrapper />
        </Box>

        {publicKey && (
          <VStack spacing={4} w="100%" maxW="md">
            <Button
              colorScheme="blue"
              size="lg"
              w="100%"
              onClick={onOpen}
              isLoading={isLoading}
            >
              Create New Draw
            </Button>
            
            <DrawList />
            <Button
              variant="outline"
              size="lg"
              w="100%"
              isLoading={isLoading}
            >
              Join Existing Draw
            </Button>
          </VStack>
        )}

        <CreateDrawModal isOpen={isOpen} onClose={onClose} onSubmit={handleCreateDraw} />
      </VStack>
    </Container>
  );
};

export default Home;
